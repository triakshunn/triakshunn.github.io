/**
 * Interactive Fish School Canvas Background
 * Personal Academic Website - Akshunn Trivedi
 */

const canvas = document.getElementById('fishCanvas');
const ctx = canvas.getContext('2d');

// Global mouse tracking state
let mouseX = -999;
let mouseY = -999;

// Track window dimensions
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Track mouse movements
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Reset mouse coordinates when cursor leaves the window
window.addEventListener('mouseleave', () => {
    mouseX = -999;
    mouseY = -999;
});

/* ==========================================================================
   Fish School Configuration
   ========================================================================== */
const SCHOOLS = [
    { angle: 0.1, color: 'rgba(91, 196, 245, 0.25)' },  // Cyan, moving right-ish
    { angle: 3.0, color: 'rgba(84, 158, 255, 0.22)' },  // Darker blue, moving left-ish
    { angle: 0.4, color: 'rgba(165, 227, 255, 0.20)' }, // Light blue, moving right-down
    { angle: 2.8, color: 'rgba(110, 180, 245, 0.24)' }, // Sky blue, moving left-up
    { angle: 0.05, color: 'rgba(138, 194, 255, 0.18)' }  // Translucent blue, drifting right
];

const fishes = [];

// Spawn 5 to 7 fish per school
SCHOOLS.forEach((school) => {
    const numFishInSchool = Math.floor(Math.random() * 3) + 5; // 5 to 7 fish
    for (let i = 0; i < numFishInSchool; i++) {
        fishes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: 0,
            vy: 0,
            angle: school.angle + (Math.random() * 0.3 - 0.15), // school base angle +/- 0.15 rad
            speed: Math.random() * 0.4 + 0.5,                  // base speed (0.5 to 0.9 px/frame)
            size: Math.floor(Math.random() * 12) + 14,         // size length (14px to 26px)
            color: school.color,
            wobble: Math.random() * Math.PI * 2,               // starting tail animation phase
            wobbleSpeed: Math.random() * 0.03 + 0.04,          // tail speed
            schoolAngle: school.angle,
            deflected: false,
            deflectTimer: 0
        });
    }
});

/* ==========================================================================
   Physics & Interaction Logic
   ========================================================================== */

/**
 * Geometric hit test: Checks if cursor is inside the fish's elliptical body bounds.
 */
function checkMouseHit(fish, mx, my) {
    const dx = mx - fish.x;
    const dy = my - fish.y;

    // Transform coordinates into the fish's local coordinate system (aligned with its heading)
    const localX = dx * Math.cos(-fish.angle) - dy * Math.sin(-fish.angle);
    const localY = dx * Math.sin(-fish.angle) + dy * Math.cos(-fish.angle);

    // Ellipse equation: (x/a)^2 + (y/b)^2 < 1
    const a = fish.size * 0.6;   // Body half-length
    const b = fish.size * 0.24;  // Body half-width

    return (localX / a) * (localX / a) + (localY / b) * (localY / b) < 1;
}

/**
 * Triggered on collision: Deflects the fish 90 degrees with a brief velocity burst.
 */
function deflectFish(fish) {
    // Determine perpendicular angle (90 degrees to its current heading)
    const perpAngle = fish.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);

    // Inject burst velocity
    fish.vx = Math.cos(perpAngle) * 3.5;
    fish.vy = Math.sin(perpAngle) * 3.5;
    fish.angle = perpAngle;

    fish.deflected = true;
    fish.deflectTimer = 150; // Active for 150 frames (~2.5s at 60fps)
}

/**
 * Updates positions, applies steering forces, and handles boundary wrapping.
 */
function updateFish(fish) {
    // Tail oscillation phase
    fish.wobble += fish.wobbleSpeed;

    // Gentle wander: natural micro-curves in swimming heading
    if (!fish.deflected) {
        fish.angle += Math.sin(fish.wobble) * 0.007;
    }

    // Handle recovery physics if currently deflected
    if (fish.deflected) {
        fish.deflectTimer--;

        // Apply drag to gradually decay the deflection speed burst
        fish.vx *= 0.95;
        fish.vy *= 0.95;

        // Gradually steer heading back toward the original school angle
        const angleDiff = fish.schoolAngle - fish.angle;
        // Normalize angle difference to [-PI, PI]
        const shortestAngle = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        fish.angle += shortestAngle * 0.025; // 2.5% correction steer per frame

        // Determine current speed magnitude
        const currentSpeed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy);

        // Rejoin school cruising once speed decayed and timer runs low
        if (currentSpeed < fish.speed * 1.1 || fish.deflectTimer <= 0) {
            fish.deflected = false;
        }
    }

    // Normal cruising motion
    if (!fish.deflected) {
        fish.vx = Math.cos(fish.angle) * fish.speed;
        fish.vy = Math.sin(fish.angle) * fish.speed;
    }

    // Apply velocity steps
    fish.x += fish.vx;
    fish.y += fish.vy;

    // Wrap around screen boundaries with margin (40px offscreen buffer)
    const margin = 40;
    if (fish.x > canvas.width + margin) fish.x = -margin;
    if (fish.x < -margin) fish.x = canvas.width + margin;
    if (fish.y > canvas.height + margin) fish.y = -margin;
    if (fish.y < -margin) fish.y = canvas.height + margin;
}

/* ==========================================================================
   Rendering (Canvas Painting)
   ========================================================================== */

/**
 * Renders a single fish (tail, body, eye, glow shadow)
 */
function drawFish(fish, ctx) {
    ctx.save();

    // Position and rotate canvas to fish heading
    ctx.translate(fish.x, fish.y);
    ctx.rotate(fish.angle);

    // Calculate side-to-side tail wobble sweep
    const tailWobble = Math.sin(fish.wobble * 2) * fish.size * 0.16;

    // 1. Draw Tail Fin (Triangle at back)
    ctx.beginPath();
    ctx.moveTo(-fish.size * 0.5, 0); // Tail junction
    ctx.lineTo(-fish.size * 0.95, tailWobble + fish.size * 0.24); // Upper fin tip
    ctx.lineTo(-fish.size * 0.95, tailWobble - fish.size * 0.24); // Lower fin tip
    ctx.closePath();
    ctx.fillStyle = fish.color;
    ctx.fill();

    // 2. Draw Main Body (Translucent Ellipse with Glow Shadow)
    ctx.beginPath();
    ctx.ellipse(0, 0, fish.size * 0.55, fish.size * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = fish.color;

    // Create solid glowing drop shadow
    ctx.shadowColor = fish.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0.7)');
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow blur to avoid bleed

    // 3. Draw Eye (Small bright dot near front)
    ctx.beginPath();
    ctx.arc(fish.size * 0.28, -fish.size * 0.07, fish.size * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
}

/* ==========================================================================
   Animation Loop
   ========================================================================== */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < fishes.length; i++) {
        const fish = fishes[i];

        // Check for cursor collision (only check active/undeflected fish)
        if (!fish.deflected && mouseX !== -999) {
            if (checkMouseHit(fish, mouseX, mouseY)) {
                deflectFish(fish);
            }
        }

        updateFish(fish);
        drawFish(fish, ctx);
    }

    requestAnimationFrame(animate);
}

// Start animation loop
animate();
