/**
 * Logs into Kibana via the UI using Playwright, reading secrets from env vars.
 *
 * Usage (recommended, avoids secrets in shell history):
 *   export KIBANA_USERNAME=elastic
 *   read -s KIBANA_PASSWORD && export KIBANA_PASSWORD
 *   node scripts/ai/kibana_login_playwright.mjs
 *
 * Optional env:
 *   - KIBANA_URL: default http://localhost:5601
 *   - KIBANA_DEFAULT_PATH: default /app/agent_builder (where to land after login)
 *   - SHOW:       set to "1" to run headful (opens a browser window)
 *   - STORAGE_STATE_PATH: save authenticated storage state JSON to this path
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

async function loadDotEnvFileIfPresent() {
    // Opt-in local file that should be gitignored by the user.
    // We only load if it exists; we never print its contents.
    const dotenvPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(dotenvPath)) return;

    // Lazy import so this script still runs even if dependency graph changes.
    // eslint-disable-next-line import/no-extraneous-dependencies
    const dotenv = await import('dotenv');
    dotenv.config({ path: dotenvPath });
}

await loadDotEnvFileIfPresent();

const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const KIBANA_DEFAULT_PATH = process.env.KIBANA_DEFAULT_PATH ?? '/app/agent_builder';
const KIBANA_USERNAME = process.env.KIBANA_USERNAME ?? 'elastic';
const KIBANA_PASSWORD = process.env.KIBANA_PASSWORD;

if (!KIBANA_PASSWORD) {
    // Intentionally do not print any provided secret material.
    // Also avoid suggesting passing the password as a CLI arg (it can leak to process lists).
    throw new Error(
        [
            'Missing required env var: KIBANA_PASSWORD',
            '',
            'Set it securely, e.g.:',
            '  export KIBANA_USERNAME=elastic',
            '  read -s KIBANA_PASSWORD && export KIBANA_PASSWORD',
            '  node scripts/ai/kibana_login_playwright.mjs',
            '  unset KIBANA_PASSWORD',
        ].join('\n')
    );
}

const headless = process.env.SHOW ? false : true;

const browser = await chromium.launch({ headless });
const context = await browser.newContext();
const page = await context.newPage();

const nextPath = KIBANA_DEFAULT_PATH.startsWith('/') ? KIBANA_DEFAULT_PATH : `/${KIBANA_DEFAULT_PATH}`;
await page.goto(`${KIBANA_URL}/login?next=${encodeURIComponent(nextPath)}`, { waitUntil: 'domcontentloaded' });
await page.getByRole('textbox', { name: 'Username' }).fill(KIBANA_USERNAME);
await page.getByRole('textbox', { name: 'Password' }).fill(KIBANA_PASSWORD);
await page.getByRole('button', { name: 'Log in' }).click();

// Wait until we're no longer on the login page (or time out with a clear error).
await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), null, {
    timeout: 60_000,
});

// If Kibana shows the space selector, pick Default so we can enter the app.
const currentPathname = new URL(page.url()).pathname;
if (currentPathname === '/spaces/space_selector') {
    await page.getByRole('link', { name: 'Default' }).click();
    await page.waitForFunction(() => window.location.pathname !== '/spaces/space_selector', null, {
        timeout: 60_000,
    });
}

// Ensure we land on the intended app path (some redirects can drop the original `next`).
await page.goto(`${KIBANA_URL}${nextPath}`, { waitUntil: 'domcontentloaded' });

if (process.env.STORAGE_STATE_PATH) {
    await context.storageState({ path: process.env.STORAGE_STATE_PATH });
}

// Print non-sensitive success output.
console.log(`Logged in. Current URL: ${page.url()}`);

// Keep the browser open in SHOW mode for interactive inspection.
if (process.env.SHOW) {
    // eslint-disable-next-line no-console
    console.log('SHOW=1 is set; keeping the browser open. Press Ctrl+C to exit.');
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 1000));
    }
}

await browser.close();


