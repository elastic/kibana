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
  
  const mainFile = path.join(ROOT, 'get_repo_files.ts');
  if (fs.existsSync(mainFile) && fs.statSync(mainFile).mtimeMs > outputStat.mtimeMs) {
    return true;
  }
  return false;
}

async function build() {
  if (!needsRebuild()) return;
  
  console.log('@kbn/get-repo-files: building...');
  
  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  const esbuild = require('esbuild');
  
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'get_repo_files.ts')],
    outfile: path.join(TARGET, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: true,
    external: ['fs', 'path', 'url', 'module', 'child_process', 'os', 'util', 'stream', 'events', 'buffer'],
  });
  
  console.log('@kbn/get-repo-files: build complete');
}

build().catch((err) => {
  console.error('@kbn/get-repo-files: build failed', err);
  process.exit(1);
});
