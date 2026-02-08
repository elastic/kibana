/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Set up Node.js environment (warnings, DNS, security hardening)
await import(resolve(REPO_ROOT, 'src/setup_node_env/index.js'));

// Bootstrap Vite Module Runner for TypeScript support
const { createViteServerRuntime } = await import('@kbn/vite-server');
const runtime = await createViteServerRuntime({
  repoRoot: REPO_ROOT,
  hmr: false,
  useCache: true,
});

// Load @kbn/optimizer through Vite and run the CLI
const optimizer = await runtime.executeModule('@kbn/optimizer');
const repoInfo = await runtime.executeModule('@kbn/repo-info');

optimizer.exports.runKbnOptimizerCli({
  defaultLimitsPath: resolve(repoInfo.exports.REPO_ROOT, 'packages/kbn-optimizer/limits.yml'),
});
