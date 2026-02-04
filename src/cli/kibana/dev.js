/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Kibana development mode entry point.
 *
 * TypeScript transpilation is handled by Vite Module Runner.
 * babel-register has been removed from the codebase.
 */

const collectExtendedStackTrace = process.argv.includes('--extended-stack-trace');

if (collectExtendedStackTrace) {
  // Using these modules when in dev mode to extend the stack traces.
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('trace');
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('clarify');
}

if (process.features.require_module) {
  console.warn(
    "Node.js's experimental support for native ES modules is enabled. " +
      'It is recommended to add `--no-experimental-require-module` to NODE_OPTIONS.'
  );
}

// Setup Node.js environment (no babel-register)
require('@kbn/setup-node-env');

// NOTE: APM initialization is deferred until after Vite is running
// because it requires TypeScript packages that need transpilation.
// The APM init happens inside vite_cli.mjs via Vite Module Runner.

// Bootstrap using Vite Module Runner for TypeScript transpilation
(async () => {
  try {
    const { bootstrapViteCli } = await import('../serve/vite_cli.mjs');
    await bootstrapViteCli();
  } catch (error) {
    console.error('[vite] Failed to bootstrap:', error);
    process.exit(1);
  }
})();
