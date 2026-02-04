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

function getSourceFiles() {
  const files = [];
  const dirs = ['src', 'cli'];
  
  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
        files.push(path.join(dir, item));
      }
    }
  }
  
  return files;
}

function needsRebuild() {
  const outputFile = path.join(TARGET, 'cli', 'index.js');
  if (!fs.existsSync(outputFile)) {
    return true;
  }

  const outputStat = fs.statSync(outputFile);
  const sourceFiles = getSourceFiles();

  for (const file of sourceFiles) {
    const sourcePath = path.join(ROOT, file);
    if (fs.existsSync(sourcePath)) {
      const stat = fs.statSync(sourcePath);
      if (stat.mtimeMs > outputStat.mtimeMs) {
        return true;
      }
    }
  }

  return false;
}

async function build() {
  if (!needsRebuild()) {
    return;
  }

  console.log('@kbn/yarn-install-scripts: building...');

  // Ensure target directories exist
  if (!fs.existsSync(path.join(TARGET, 'cli'))) {
    fs.mkdirSync(path.join(TARGET, 'cli'), { recursive: true });
  }
  if (!fs.existsSync(path.join(TARGET, 'src'))) {
    fs.mkdirSync(path.join(TARGET, 'src'), { recursive: true });
  }

  const esbuild = require('esbuild');

  // Build CLI entry point
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'cli', 'index.ts')],
    outfile: path.join(TARGET, 'cli', 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: true,
    external: ['fs', 'path', 'url', 'module', 'child_process'],
  });

  // Build src entry point  
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src', 'index.ts')],
    outfile: path.join(TARGET, 'src', 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: true,
    external: ['fs', 'path', 'url', 'module', 'child_process'],
  });

  // Copy config.json to target directory so bundled code can find it
  fs.copyFileSync(path.join(ROOT, 'config.json'), path.join(TARGET, 'config.json'));

  console.log('@kbn/yarn-install-scripts: build complete');
}

build().catch((err) => {
  console.error('@kbn/yarn-install-scripts: build failed', err);
  process.exit(1);
});
