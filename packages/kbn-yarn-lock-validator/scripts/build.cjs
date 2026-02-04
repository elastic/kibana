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
  
  const indexPath = path.join(ROOT, 'index.ts');
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).mtimeMs > outputStat.mtimeMs) {
    return true;
  }
  
  const srcDir = path.join(ROOT, 'src');
  if (fs.existsSync(srcDir)) {
    for (const file of fs.readdirSync(srcDir)) {
      if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
        if (fs.statSync(path.join(srcDir, file)).mtimeMs > outputStat.mtimeMs) {
          return true;
        }
      }
    }
  }
  return false;
}

async function build() {
  if (!needsRebuild()) return;
  
  console.log('@kbn/yarn-lock-validator: building...');
  
  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  const esbuild = require('esbuild');
  
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'index.ts')],
    outfile: path.join(TARGET, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: true,
    external: ['fs', 'path', 'url', 'module', 'crypto', 'child_process', 'os', 'util', 'stream', 'events', 'buffer', 'assert'],
  });
  
  console.log('@kbn/yarn-lock-validator: build complete');
}

build().catch((err) => {
  console.error('@kbn/yarn-lock-validator: build failed', err);
  process.exit(1);
});
