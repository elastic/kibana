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
  await import('trace');
  // eslint-disable-next-line import/no-extraneous-dependencies
  await import('clarify');
}

// This file runs inside Vite Module Runner (loaded by scripts/kibana.mts).
// Use import() instead of require() so the entire CLI chain stays within
// Vite's module runner, which handles TypeScript transpilation and proper
// module resolution for @kbn/* packages.
await import('./cli');
