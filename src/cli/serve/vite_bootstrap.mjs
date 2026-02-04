/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Vite-based bootstrap for Kibana dev mode.
 *
 * This module starts a Vite server and uses its Module Runner to load
 * all TypeScript code, eliminating the need for babel-register.
 *
 * Flow:
 * 1. Create Vite dev server (using pre-built @kbn/vite-server)
 * 2. Use Module Runner to import CLI dev mode
 * 3. Run Kibana through Vite's transpilation pipeline
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Calculate repo root (this file is at src/cli/serve/vite_bootstrap.mjs)
const REPO_ROOT = resolve(__dirname, '../../..');

/**
 * Bootstrap Kibana using Vite Module Runner for TypeScript transpilation.
 * This replaces the babel-register based approach.
 */
export async function bootstrapWithVite(options) {
  const { configs, cliArgs, applyConfigOverrides } = options;

  console.log('[vite-bootstrap] Starting Vite-based Kibana bootstrap...');

  try {
    // Import the pre-built Vite server package
    // This is already compiled to ESM JavaScript, no transpilation needed
    const { createViteServerRuntime } = await import('@kbn/vite-server');

    // Create the Vite server runtime
    const viteServer = await createViteServerRuntime({
      repoRoot: REPO_ROOT,
      hmr: true,
      useCache: true,
    });

    console.log('[vite-bootstrap] Vite server runtime initialized');

    // Use Vite Module Runner to import the CLI dev mode
    // This will transpile TypeScript on-the-fly
    const cliDevMode = await viteServer.executeModule('@kbn/cli-dev-mode');

    if (!cliDevMode.exports.bootstrapDevMode) {
      throw new Error('bootstrapDevMode not found in @kbn/cli-dev-mode');
    }

    console.log('[vite-bootstrap] Loaded @kbn/cli-dev-mode via Vite');

    // Run the dev mode bootstrap
    await cliDevMode.exports.bootstrapDevMode({
      configs,
      cliArgs,
      applyConfigOverrides,
    });
  } catch (error) {
    console.error('[vite-bootstrap] Failed to bootstrap with Vite:', error);
    throw error;
  }
}

/**
 * Bootstrap the Kibana child process (the actual server) using Vite.
 * Called when isDevCliChild === 'true'
 */
export async function bootstrapChildWithVite(options) {
  const { configs, cliArgs, applyConfigOverrides } = options;

  console.log('[vite-bootstrap] Starting Kibana server via Vite Module Runner...');

  try {
    // Import the pre-built Vite server package
    const { createViteServerRuntime } = await import('@kbn/vite-server');

    // Create the Vite server runtime
    const viteServer = await createViteServerRuntime({
      repoRoot: REPO_ROOT,
      hmr: cliArgs.watch !== false,
      useCache: true,
    });

    console.log('[vite-bootstrap] Vite server runtime initialized for child process');

    // Use Vite Module Runner to import the core bootstrap
    const coreServer = await viteServer.executeModule('@kbn/core/server');

    if (!coreServer.exports.bootstrap) {
      throw new Error('bootstrap not found in @kbn/core/server');
    }

    console.log('[vite-bootstrap] Loaded @kbn/core/server via Vite');

    // Run the core bootstrap
    await coreServer.exports.bootstrap({
      configs,
      cliArgs,
      applyConfigOverrides,
    });
  } catch (error) {
    console.error('[vite-bootstrap] Failed to bootstrap child with Vite:', error);
    throw error;
  }
}
