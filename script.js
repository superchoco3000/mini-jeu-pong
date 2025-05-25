// État du jeu et configuration du Canvas
let gameStarted = true; // État initial : le jeu est en cours

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Résolution de base pour le calcul des dimensions responsives
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

// Variables pour les éléments du jeu (leurs valeurs seront mises à jour par resizeGame)
let ballRadius;
let x, y; // Position de la balle
let dx, dy; // Vitesse de la balle (représentera la vitesse de base responsive)

let paddleHeight;
let paddleWidth;
let paddleX; // Position de la raquette

let brickRowCount;
let brickColumnCount;
let brickWidth;
let brickHeight;
let brickPadding;
let brickOffsetTop; // Décalage du haut pour la première ligne de briques
let brickOffsetLeft;
let bricks = [];
let score = 0;
let brickColor = '#0095DD'; // Couleur initiale des briques

// Particules pour les effets de collision (des briques)
let particles = []; 

// Variables pour le message "Bravo!"
let bravoMessageActive = false; 
let bravoMessageTimeout = null; 
let lastBrickHitTime = 0; // Pour suivre le temps du dernier coup de brique pour le message "Bravo!"

// Variables pour le contrôle de la vitesse de la balle
const BASE_BALL_SPEED = 2; // Vitesse de base de la balle
const MAX_SPEED_INCREASE_FACTOR = 0.85; // Augmentation maximale de 85% de la vitesse sur l'ensemble du jeu
let ballSpeedMultiplier = 1.0; // Multiplicateur de vitesse actuel de la balle

// Variables pour le système de vies
let lives = 3; // Nombre de vies initial
let isBallInvincible = false; // État d'invincibilité de la balle (pour le clignotement)
let invincibilityTimeout = null; // Pour gérer le timer d'invincibilité

// Entrées utilisateur (pour le contrôle de la raquette)
let rightPressed = false;
let leftPressed = false;

// Entrées tactiles (NOUVELLES VARIABLES)
let touchLeft = false;
let touchRight = false;

// --- VARIABLES GLOBALES POUR LES FEUX D'ARTIFICE (MODIFIÉES POUR PLUS DE SPECTACLE) ---
var baseFireNumber = 100; // Augmenté pour encore plus de particules par explosion
var range = 300; 
var fireworkGravity = 0.025; 
var fireworkTypes = ['circle', 'denseCircle', 'sparseCircle']; 
var colorsPerFirework = [6, 7, 8]; 
var initialSparkLife = 50; 
var initialSparkSize = 6; 
var initialSparkVelocity = 0.5; 
var initialSparkCount = 30; 
var whiteFlashRadius = 12; 
var whiteFlashDuration = 15; 
var fireworkCreationRate = 0.07; // Augmenté pour plus de feux d'artifice simultanés

// Tableau pour stocker les instances des feux d'artifice complexes
let complexFireworks = []; 
let gameWon = false; // Variable pour l'état de victoire du jeu

// --- Fonctions Utilitaires ---

/**
 * Génère une couleur RGBA aléatoire sous forme d'objet.
 * @param {number} alpha - Valeur d'opacité (entre 0 et 1).
 * @returns {object} - Objet contenant les composants r, g, b, a.
 */
function randomRGBA(alpha = 1) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return { r, g, b, a: alpha }; 
}

/**
 * Génère un code couleur hexadécimal aléatoire brillant.
 * @returns {string} - Chaîne de couleur hexadécimale.
 */
function rendBrightColor() {
    var letters = 'ABCDEF';
    var numbers = '89';
    var allChars = letters + numbers;
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += allChars[Math.floor(Math.random() * allChars.length)];
    }
    return color;
}

// --- Fonctions de création de motifs de particules pour les feux d'artifice ---

/**
 * Fonction de base pour créer un motif circulaire de particules.
 * @param {object} fire - L'objet feu d'artifice parent (FireworkRocket).
 * @param {number} particleCountFactor - Facteur pour le nombre de particules.
 * @param {number} velocityFactor - Facteur pour la vitesse des particules.
 * @param {number} spreadFactor - Facteur pour la dispersion des particules.
 * @returns {Array<object>} - Tableau de particules.
*/
function createCircularPattern(fire, particleCountFactor, velocityFactor, spreadFactor) {
    var particles = [];
    var velocityBase = 5 * velocityFactor; 
    var max = baseFireNumber * particleCountFactor;
    var colorCount = colorsPerFirework[Math.floor(Math.random() * colorsPerFirework.length)];
    var colors = [];
    for (var i = 0; i < colorCount; i++) {
        colors.push(rendBrightColor()); 
    }

    // Calcul du ratio pour la taille des particules
    const sizeRatio = Math.min(canvas.width / BASE_WIDTH, canvas.height / BASE_HEIGHT);

    for (var i = 0; i < max; i++) {
        var rad = (i * Math.PI * 2) / max + (Math.random() - 0.5) * 0.6; 
        var color = colors[i % colors.length];
        var velocity = Math.random() * 1.0 + velocityBase; 
        // MODIFIÉ: Réduction de la taille des particules pour un effet plus "distant" et responsif
        var size = (Math.random() * 1.2 + 0.8) * sizeRatio; 
        var fireworkParticle = { 
            x: fire.x,
            y: fire.y,
            size: size,
            fill: color, // Couleur hexadécimale
            vx: Math.cos(rad) * velocity + (Math.random() - 0.5) * spreadFactor * 0.7, 
            vy: Math.sin(rad) * velocity + (Math.random() - 0.5) * spreadFactor * 0.7, 
            ay: fireworkGravity, // Utilise la gravité spécifique aux feux d'artifice
            life: Math.round((Math.random() * range) / 2) + range / 2, 
            alpha: 1
        };
        particles.push(fireworkParticle);
    }
    return particles;
}

/**
 * Crée un feu d'artifice de type "cercle".
 */
function makeCircleFirework(fire) {
    return createCircularPattern(fire, 16, 0.9, 0.5);
}

/**
 * Crée un feu d'artifice de type "cercle dense".
 */
function makeDenseCircleFirework(fire) {
    return createCircularPattern(fire, 24, 0.7, 0.3);
}

/**
 * Crée un feu d'artifice de type "cercle clairsemé".
 */
function makeSparseCircleFirework(fire) {
    return createCircularPattern(fire, 10, 1.1, 0.8);
}

// --- CLASSES POUR LES FEUX D'ARTIFICE COMPLEXES ---

/**
 * Classe pour un seul feu d'artifice (fusée et explosion).
 */
class FireworkRocket { 
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height; // Commence en bas de l'écran
        this.rocketGravity = 0.05 * (canvas.height / BASE_HEIGHT); // Gravité pour l'ascension de la fusée
        this.exploded = false;
        this.particles = []; // Particules de l'explosion principale
        this.initialSparks = []; // Étincelles pendant l'ascension de la fusée

        this.launchVelocity = (Math.random() * 10 + 10) * (canvas.height / BASE_HEIGHT);
        this.vx = (Math.random() - 0.5) * 3 * (canvas.width / BASE_WIDTH);
        this.vy = -this.launchVelocity; // Vitesse initiale vers le haut
        this.rocketColor = randomRGBA(); // Couleur de la fusée (objet RGBA)

        // Configuration des étincelles initiales
        this.initialSparkColors = [];
        for (let i = 0; i < initialSparkCount; i++) {
            this.initialSparkColors.push(Math.random() < 0.8 ? rendBrightColor() : 'yellow');
        }
        this.whiteFlashTime = Math.round(Math.random() * whiteFlashDuration) + whiteFlashDuration;
    }

    update() {
        if (!this.exploded) {
            this.vy += this.rocketGravity; // Applique la gravité pour ralentir l'ascension
            this.x += this.vx;
            this.y += this.vy;

            // Si la fusée commence à redescendre, elle explose
            if (this.vy >= 0) {
                this.exploded = true;
                this.explode();
            }
        } else {
            // Met à jour les particules de l'explosion principale
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                // Mise à jour manuelle des propriétés de la particule
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += particle.ay; // Utilise la gravité de la particule
                particle.life--;
                particle.alpha = Math.max(0, particle.life / range); // Utilise la portée globale des feux d'artifice

                if (particle.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
            // Met à jour les étincelles initiales
            for (let i = this.initialSparks.length - 1; i >= 0; i--) {
                const spark = this.initialSparks[i];
                spark.x += spark.vx;
                spark.y += spark.vy;
                spark.life--;
                spark.size *= 0.97; // Se rétrécit un peu plus vite
                spark.alpha = Math.max(0, spark.life / initialSparkLife);

                if (spark.life <= 0) {
                    this.initialSparks.splice(i, 1);
                }
            }
        }
    }

    // C'est la méthode draw() de la classe FireworkRocket, elle doit être ici.
    draw() {
        // Calcul du ratio pour la taille des éléments (pour les étincelles initiales et le flash)
        const sizeRatio = Math.min(canvas.width / BASE_WIDTH, canvas.height / BASE_HEIGHT);

        if (!this.exploded) {
            // Dessine la traînée de la fusée en ascension
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2 * sizeRatio, 0, Math.PI * 2); // Taille de la traînée adaptée
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 10 * sizeRatio; // Ombre adaptée
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Dessine le flash blanc initial
            if (this.whiteFlashTime > 0) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, whiteFlashRadius * 1.2 * sizeRatio, 0, Math.PI * 2); // Taille du flash adaptée
                ctx.fillStyle = 'rgba(255, 255, 255, ' + this.whiteFlashTime / whiteFlashDuration + ')';
                ctx.fill();
                this.whiteFlashTime--;
            }

            // Dessine les étincelles initiales
            for (const spark of this.initialSparks) {
                ctx.beginPath();
                ctx.arc(spark.x, spark.y, Math.max(0, spark.size * sizeRatio), 0, Math.PI * 2); // Taille des étincelles adaptée
                ctx.fillStyle = spark.color; // Couleur hexadécimale
                ctx.globalAlpha = spark.alpha;
                ctx.fill();
                ctx.globalAlpha = 1; 
            }

            // Dessine les particules de l'explosion principale
            for (const particle of this.particles) {
                // Les particules sont déjà mises à jour dans FireworkRocket.update()
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); 
                ctx.fillStyle = particle.fill; // Couleur hexadécimale
                ctx.globalAlpha = particle.alpha;
                ctx.fill();
                ctx.globalAlpha = 1; 
            }
        }
    }

    explode() {
        const fireworkType = fireworkTypes[Math.floor(Math.random() * fireworkTypes.length)];
        switch (fireworkType) {
            case 'circle':
                this.particles = makeCircleFirework(this);
                break;
            case 'denseCircle':
                this.particles = makeDenseCircleFirework(this);
                break;
            case 'sparseCircle':
                this.particles = makeSparseCircleFirework(this);
                break;
            default:
                this.particles = makeCircleFirework(this);
                break;
        }
    }
}


// --- Fonctions du Jeu ---

/**
 * Redimensionne et recalcule toutes les dimensions du jeu en fonction de la taille actuelle du canvas.
 * Cette fonction est appelée au démarrage et lors du redimensionnement de la fenêtre.
 */
function resizeGame() {
    const currentWidth = canvas.clientWidth;
    const currentHeight = canvas.clientHeight;
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    const widthRatio = canvas.width / BASE_WIDTH;
    const heightRatio = canvas.height / BASE_HEIGHT;
    const effectiveWidthRatio = Math.min(widthRatio, 2.0);
    const effectiveHeightRatio = Math.min(heightRatio, 2.0);

    ballRadius = 10 * Math.min(widthRatio, heightRatio);
    paddleHeight = 10 * effectiveHeightRatio;
    paddleWidth = 150 * effectiveWidthRatio;
    
    // dx et dy représentent maintenant la vitesse de base, sans le multiplicateur lié au score
    dx = (dx > 0 ? BASE_BALL_SPEED : -BASE_BALL_SPEED) * effectiveWidthRatio;
    dy = (dy > 0 ? -BASE_BALL_SPEED : BASE_BALL_SPEED) * effectiveHeightRatio;

    brickRowCount = 5;
    brickColumnCount = 20;
    brickPadding = 1 * Math.min(widthRatio, heightRatio);
    brickOffsetLeft = 30 * effectiveWidthRatio;
    const availableWidthForBricks = canvas.width - (brickOffsetLeft * 2);
    brickWidth = (availableWidthForBricks - (brickColumnCount - 1) * brickPadding) / brickColumnCount;
    if (brickWidth < 1) brickWidth = 1;
    brickHeight = paddleHeight;
    brickOffsetTop = 20 * effectiveHeightRatio;

    // Réinitialise la position de la balle et de la raquette après redimensionnement
    // pour éviter qu'ils ne soient hors écran ou mal positionnés
    if (gameStarted) {
        x = canvas.width / 2;
        y = canvas.height - paddleHeight - ballRadius - (10 * effectiveHeightRatio);
        paddleX = (canvas.width - paddleWidth) / 2;
    }

    initBricks();
}

/**
 * Initialise ou réinitialise la disposition des briques.
 */
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
    }
}

/**
 * Change la couleur des briques pour une couleur hexadécimale aléatoire.
 */
function changeBrickColor() {
    brickColor = '#' + Math.floor(Math.random()*16777215).toString(16);
}

/**
 * Dessine la balle sur le canvas.
 */
function drawBall() {
    // Ne dessine pas la balle si le jeu est gagné
    if (gameWon) return; 

    // Effet de clignotement si la balle est invincible
    // La balle est dessinée si elle n'est pas invincible, ou si le timer de clignotement est pair
    if (isBallInvincible && Math.floor(Date.now() / 150) % 2 === 0) { // Clignote toutes les 150ms
        return; // Ne dessine pas la balle pour créer l'effet
    }
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

/**
 * Dessine la raquette sur le canvas.
 */
function drawPaddle() {
    // Ne dessine pas la raquette si le jeu est gagné
    if (gameWon) return; 

    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

/**
 * Dessine toutes les briques actives sur le canvas.
 */
function drawBricks() {
    // Ne dessine pas les briques si le jeu est gagné
    if (gameWon) return; 

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = brickColor;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

/**
 * Dessine le score actuel sur le canvas.
 */
function drawScore() {
    // Ne dessine pas le score si le jeu est gagné
    if (gameWon) return; 

    const widthRatio = canvas.width / BASE_WIDTH;
    const heightRatio = canvas.height / BASE_HEIGHT;
    ctx.font = `${20 * Math.min(widthRatio, heightRatio)}px Arial`;
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + score, 8 * widthRatio, 15 * heightRatio);
}

/**
 * Dessine le nombre de vies actuel sur le canvas.
 */
function drawLives() {
    // Ne dessine pas les vies si le jeu est gagné
    if (gameWon) return; 

    const widthRatio = canvas.width / BASE_WIDTH;
    const heightRatio = canvas.height / BASE_HEIGHT;
    ctx.font = `${20 * Math.min(widthRatio, heightRatio)}px Arial`;
    ctx.fillStyle = "#0095DD";
    // Positionne le texte des vies en haut à droite
    ctx.fillText("Lives: " + lives, canvas.width - (80 * widthRatio), 15 * heightRatio); 
}

/**
 * Détecte les collisions entre la balle et les briques.
 */
function collisionDetection() {
    let bricksBrokenInThisFrame = 0; // Compteur pour les briques cassées dans cette frame

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                // Vérifie la collision de la balle avec la brique
                if (x + ballRadius > b.x && x - ballRadius < b.x + brickWidth &&
                    y + ballRadius > b.y && y - ballRadius < b.y + brickHeight) {
                    
                    dy = -dy; // Inverse la direction verticale de la balle
                    b.status = 0; // Marque la brique comme cassée
                    score++;
                    bricksBrokenInThisFrame++; // Incrémente le compteur pour cette frame
                    createParticles(b.x + brickWidth / 2, b.y + brickHeight / 2, brickColor);

                    // Met à jour le multiplicateur de vitesse de la balle
                    ballSpeedMultiplier = 1 + (score / (brickRowCount * brickColumnCount)) * MAX_SPEED_INCREASE_FACTOR;
                }
            }
        }
    }

    // Déclenche "Bravo!" si des points sont marqués à plus d'un par seconde
    const currentTime = Date.now();
    if (bricksBrokenInThisFrame > 0 && (currentTime - lastBrickHitTime < 1000)) { 
        bravoMessageActive = true;
        // Efface tout timer existant pour que le 1.5s redémarre à partir de ce nouveau déclenchement
        if (bravoMessageTimeout) { 
            clearTimeout(bravoMessageTimeout);
        }
        bravoMessageTimeout = setTimeout(() => {
            bravoMessageActive = false;
            bravoMessageTimeout = null; // Efface la référence
        }, 1500); // Le message disparaît après 1.5 secondes
    }
    // Met à jour lastBrickHitTime uniquement si au moins une brique a été cassée dans cette frame
    if (bricksBrokenInThisFrame > 0) {
        lastBrickHitTime = currentTime;
    }


    if (score === brickRowCount * brickColumnCount) {
        gameWon = true;
        gameStarted = false;
        // initFireworks() est appelé ici pour démarrer l'animation des feux d'artifice
        initFireworks(); 
        // Délai avant la réinitialisation du jeu (45 secondes pour voir les feux d'artifice)
        setTimeout(function() {
            resetGame();
            gameWon = false;
        }, 45000); 
    }
}

/**
 * Crée de petites particules pour un effet visuel (pour les briques cassées).
 */
function createParticles(x, y, color) {
    const widthRatio = canvas.width / BASE_WIDTH;
    const heightRatio = canvas.height / BASE_HEIGHT;
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x,
            y: y,
            size: (Math.random() * 3 + 1) * Math.min(widthRatio, heightRatio),
            color: color, // Couleur hexadécimale
            dx: (Math.random() - 0.5) * 5 * widthRatio,
            dy: (Math.random() - 0.5) * 5 * heightRatio,
            alpha: 1
        });
    }
}

/**
 * Dessine et anime les particules (pour les briques cassées).
 */
function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        // Convertit la couleur hexadécimale en RGBA pour le dessin
        ctx.fillStyle = `rgba(${parseInt(p.color.substring(1,3), 16)}, ${parseInt(p.color.substring(3,5), 16)}, ${parseInt(p.color.substring(5,7), 16)}, ${p.alpha})`;
        ctx.fill();
        ctx.closePath();
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

// --- GESTION DES FEUX D'ARTIFICE COMPLEXES ---

/**
 * Initialise les feux d'artifice complexes lors de la victoire.
 */
function initFireworks() {
    complexFireworks = []; // Vide le tableau des feux d'artifice existants
    const numberOfInitialFireworks = 5; // Nombre initial de fusées lancées
    for (let i = 0; i < numberOfInitialFireworks; i++) {
        complexFireworks.push(new FireworkRocket()); // Crée de nouvelles fusées de feux d'artifice
    }
}

/**
 * Dessine et anime les feux d'artifice complexes.
 */
function drawFireworks() {
    if (gameWon) {
        // Lance continuellement de nouvelles fusées pendant l'état de victoire
        if (Math.random() < fireworkCreationRate) {
            complexFireworks.push(new FireworkRocket());
        }

        for (let i = complexFireworks.length - 1; i >= 0; i--) {
            const firework = complexFireworks[i];
            firework.update(); // Met à jour l'état de la fusée et de ses particules
            firework.draw(); // Dessine la fusée et ses particules

            // Supprime le feu d'artifice s'il a explosé et toutes ses particules ont disparu
            if (firework.exploded && firework.particles.length === 0 && firework.initialSparks.length === 0 && firework.whiteFlashTime <= 0) {
                complexFireworks.splice(i, 1);
            }
        }
    }
}

/**
 * Réinitialise la position de la balle et de la raquette.
 */
function resetBallAndPaddle() {
    const widthRatio = canvas.width / BASE_WIDTH;
    const heightRatio = canvas.height / BASE_HEIGHT;
    const effectiveHeightRatio = Math.min(heightRatio, 2.0);

    x = canvas.width / 2;
    y = canvas.height - paddleHeight - ballRadius - (10 * effectiveHeightRatio);
    // Réinitialise dx et dy à leur vitesse de base responsive
    dx = (dx > 0 ? BASE_BALL_SPEED : -BASE_BALL_SPEED) * widthRatio;
    dy = (dy > 0 ? -BASE_BALL_SPEED : BASE_BALL_SPEED) * heightRatio;
    paddleX = (canvas.width - paddleWidth) / 2;
    ballSpeedMultiplier = 1.0; // Réinitialise le multiplicateur de vitesse
}

/**
 * Réinitialise toutes les variables du jeu à leur état initial et redémarre le jeu.
 */
function resetGame() {
    score = 0;
    gameWon = false;
    bravoMessageActive = false; // Réinitialise l'état du message "Bravo!"
    if (bravoMessageTimeout) { // Annule tout timer de message "Bravo!" en cours
        clearTimeout(bravoMessageTimeout);
        bravoMessageTimeout = null;
    }
    lives = 3; // Réinitialise les vies
    isBallInvincible = false; // Assure que l'invincibilité est désactivée
    if (invincibilityTimeout) { // Annule tout timer d'invincibilité en cours
        clearTimeout(invincibilityTimeout);
        invincibilityTimeout = null;
    }
    changeBrickColor();
    initBricks();
    resetBallAndPaddle(); // Réinitialise la balle et la raquette
    gameStarted = true;
    lastBrickHitTime = 0; // Réinitialise le temps du dernier coup de brique
}

/**
 * Fonction principale de la boucle de jeu.
 */
function draw() {
    // Remplir le fond en noir si le jeu est gagné, sinon effacer
    if (gameWon) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Si le jeu n'est PAS gagné, dessine les éléments du jeu et exécute la logique
    if (!gameWon) {
        drawBricks();
        drawParticles(); // Particules des briques cassées
        drawBall(); 
        drawPaddle(); 
        collisionDetection(); // Détection des collisions et mise à jour du score/vitesse
        
        // ... (autres logiques du jeu)

        drawScore(); // Vérifie si cette ligne est présente et dans le if (!gameWon)
        drawLives(); // Vérifie si cette ligne est présente et dans le if (!gameWon)
        const widthRatio = canvas.width / BASE_WIDTH;
        const paddleSpeed = 7 * widthRatio;
        
        // MODIFICADO: Ahora la raqueta se mueve si la tecla está presionada O si el botón táctil está activo
        if ((rightPressed || touchRight) && paddleX < canvas.width - paddleWidth) {
            paddleX += paddleSpeed;
        } else if ((leftPressed || touchLeft) && paddleX > 0) {
            paddleX -= paddleSpeed;
        }

        if (x + dx * ballSpeedMultiplier > canvas.width - ballRadius || x + dx * ballSpeedMultiplier < ballRadius) {
            dx = -dx;
        }
        if (y + dy * ballSpeedMultiplier < ballRadius) {
            dy = -dy;
        }
        // Collision avec la raquette
        if (y + dy * ballSpeedMultiplier > canvas.height - ballRadius - paddleHeight && x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy;
        }
        // Balle hors limites (en bas)
        if (y + dy * ballSpeedMultiplier > canvas.height - ballRadius) {
            lives--; // Perdre une vie

            if (lives > 0) {
                // Le joueur perd une vie, mais le jeu n'est pas encore terminé
                resetBallAndPaddle(); // Réinitialise la position de la balle et de la raquette
                isBallInvincible = true; // Démarre l'invincibilité
                if (invincibilityTimeout) clearTimeout(invincibilityTimeout); // Annule tout timer précédent
                invincibilityTimeout = setTimeout(() => {
                    isBallInvincible = false; // Termine l'invincibilité après 5 secondes
                }, 5000); // 5 secondes d'invincibilité
            } else {
                // Game Over
                const widthRatio = canvas.width / BASE_WIDTH;
                const heightRatio = canvas.height / BASE_HEIGHT;
                ctx.font = `${30 * Math.min(widthRatio, heightRatio)}px Arial`;
                ctx.fillStyle = "#FF0000";
                ctx.textAlign = "center"; // Centrer le texte Game Over
                ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
                ctx.textAlign = "start"; // Réinitialiser l'alignement
                gameStarted = false;
                setTimeout(function() {
                    resetGame(); // Réinitialisation complète du jeu
                }, 2000);
            }
        }

        if (gameStarted) {
            x += dx * ballSpeedMultiplier; // Applique le multiplicateur de vitesse
            y += dy * ballSpeedMultiplier; // Applique le multiplicateur de vitesse
        }
    } 
    
    // Dessine les feux d'artifice si le jeu est gagné (maintenant en dehors du bloc else pour qu'ils soient sous le texte)
    if (gameWon) {
        drawFireworks(); // Dessine les feux d'artifice complexes
        const widthRatio = canvas.width / BASE_WIDTH;
        const heightRatio = canvas.height / BASE_HEIGHT;
        ctx.font = `${30 * Math.min(widthRatio, heightRatio)}px Arial`;
        ctx.fillStyle = "#00FF00";
        ctx.textAlign = "center";
        ctx.fillText("Vous avez gagné !", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "start";
    }

    // Afficher le message "Bravo!" si actif (toujours dessiné au-dessus de tout le reste)
    if (bravoMessageActive) {
        const widthRatio = canvas.width / BASE_WIDTH;
        const heightRatio = canvas.height / BASE_HEIGHT;
        ctx.font = `${40 * Math.min(widthRatio, heightRatio)}px Arial`; // Taille de police plus grande
        ctx.fillStyle = "#FFD700"; // Couleur or
        ctx.textAlign = "center"; // Centrer le texte
        ctx.fillText("Bravo!", canvas.width / 2, canvas.height / 2); // Position au centre
        ctx.textAlign = "start"; // Réinitialiser l'alignement pour les autres textes
    }

    requestAnimationFrame(draw);
}

// --- Écouteurs d'Événements pour le Contrôle de la Raquette ---

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

/**
 * Gère les événements de touche enfoncée pour contrôler le mouvement de la raquette.
 * @param {KeyboardEvent} e - L'objet événement clavier.
 */
function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    }
}

/**
 * Gère les événements de touche relâchée pour arrêter le mouvement de la raquette.
 * @param {KeyboardEvent} e - L'objet événement clavier.
 */
function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

// --- NOUVEAU: Écouteurs d'Événements pour le Contrôle Tactile (Flèches) ---
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

if (leftButton) {
    leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Empêche le scroll sur mobile
        touchLeft = true;
    });
    leftButton.addEventListener('touchend', () => {
        touchLeft = false;
    });
    leftButton.addEventListener('mousedown', () => { // Pour test sur PC avec la souris
        touchLeft = true;
    });
    leftButton.addEventListener('mouseup', () => {
        touchLeft = false;
    });
    leftButton.addEventListener('mouseout', () => { // Pour s'assurer d'arrêter le mouvement si la souris quitte le bouton
        touchLeft = false;
    });
}

if (rightButton) {
    rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Empêche le scroll sur mobile
        touchRight = true;
    });
    rightButton.addEventListener('touchend', () => {
        touchRight = false;
    });
    rightButton.addEventListener('mousedown', () => { // Pour test sur PC avec la souris
        touchRight = true;
    });
    rightButton.addEventListener('mouseup', () => {
        touchRight = false;
    });
    rightButton.addEventListener('mouseout', () => { // Pour s'assurer d'arrêter le mouvement si la souris quitte le bouton
        touchRight = false;
    });
}


// --- Configuration Initiale du Jeu et Démarrage ---

// Écouteur d'événement pour le redimensionnement de la fenêtre
window.addEventListener('resize', resizeGame);

// Appelle resizeGame once on load to initialize dimensions
resizeGame();

// Initialise les briques pour la première partie (après resizeGame)
initBricks();

// Démarre la boucle de jeu principale
draw();
