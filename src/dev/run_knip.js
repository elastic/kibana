/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { spawn } = require('child_process');
const { resolve } = require('path');

// Knip is ESM-only and its `exports` map hides both `bin/knip.js` and
// `package.json`, so we cannot use `require.resolve('knip/...')` here. The
// CLI is spawned as a child process, with all args forwarded verbatim so the
// wrapper stays a thin pass-through (`node scripts/knip --help` works as
// expected).
const repoRoot = resolve(__dirname, '..', '..');
const knipBin = resolve(repoRoot, 'node_modules/knip/bin/knip.js');

const child = spawn(process.execPath, [knipBin, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
