/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.resolve(ROOT, 'target');

function needsRebuild() {
  const outputFile = path.join(TARGET, 'index.js');
  if (!fs.existsSync(outputFile)) {
    return true;
  }

  const outputStat = fs.statSync(outputFile);
  const indexPath = path.join(ROOT, 'index.js');

  if (fs.existsSync(indexPath)) {
    const stat = fs.statSync(indexPath);
    if (stat.mtimeMs > outputStat.mtimeMs) {
      return true;
    }
  }

  return false;
}

async function build() {
  if (!needsRebuild()) {
    return;
  }

  console.log('@kbn/peggy: building...');

  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  const esbuild = require('esbuild');

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'index.js')],
    outfile: path.join(TARGET, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    sourcemap: true,
    // Keep Node.js built-ins and peggy external
    external: ['fs', 'fs/promises', 'path', 'url', 'module', 'peggy'],
    banner: {
      js: `
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __pathDirname } from 'path';
import { createRequire as __createRequire } from 'module';
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
const require = __createRequire(import.meta.url);
`,
    },
    footer: {
      js: `
// Named exports for ESM compatibility
const _exports = require_index();
export const {
  findConfigFile,
  getJsSource,
  getJsSourceSync,
  requireHook,
  version,
} = _exports;
`,
    },
  });

  // Create a package.json in target to mark it as ESM
  fs.writeFileSync(path.join(TARGET, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));

  console.log('@kbn/peggy: build complete');
}

build().catch((err) => {
  console.error('@kbn/peggy: build failed', err);
  process.exit(1);
});
