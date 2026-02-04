/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Vite-based CLI bootstrap.
 *
 * This module initializes Vite and uses its Module Runner to load the Kibana CLI.
 * This replaces babel-register for TypeScript transpilation.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Calculate repo root (this file is at src/cli/serve/vite_cli.mjs)
const REPO_ROOT = resolve(__dirname, '../../..');

/**
 * Bootstrap the Kibana CLI using Vite Module Runner.
 */
export async function bootstrapViteCli() {
  console.log('[vite] Initializing Vite Module Runner...');

  try {
    // Import the pre-built Vite server package
    const { createViteServerRuntime } = await import('@kbn/vite-server');

    // Create the Vite server runtime
    const viteServer = await createViteServerRuntime({
      repoRoot: REPO_ROOT,
      hmr: true,
      useCache: true,
    });

    console.log('[vite] Vite server initialized');

    // Initialize APM via Vite (requires TypeScript transpilation)
    try {
      const apmPath = resolve(REPO_ROOT, 'src/cli/kibana/apm.js');
      const apmModule = await viteServer.executeModule(apmPath);
      if (apmModule.exports.default) {
        apmModule.exports.default(process.env.ELASTIC_APM_SERVICE_NAME || 'kibana-proxy');
      } else if (typeof apmModule.exports === 'function') {
        apmModule.exports(process.env.ELASTIC_APM_SERVICE_NAME || 'kibana-proxy');
      }
      console.log('[vite] APM initialized');
    } catch (apmError) {
      console.warn('[vite] APM initialization failed (continuing without APM):', apmError.message);
    }

    // Use Vite Module Runner to load the CLI module
    // This transpiles TypeScript on-the-fly
    const cliPath = resolve(REPO_ROOT, 'src/cli/kibana/cli.js');
    await viteServer.executeModule(cliPath);

    // The CLI module self-executes on import (parses argv and runs commands)
  } catch (error) {
    console.error('[vite] Bootstrap failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}
