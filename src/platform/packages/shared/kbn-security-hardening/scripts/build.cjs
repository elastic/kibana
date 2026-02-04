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

/**
 * Check if a rebuild is needed by comparing source and output timestamps
 */
function needsRebuild() {
  const outputFile = path.join(TARGET, 'index.js');
  if (!fs.existsSync(outputFile)) {
    return true;
  }

  const outputStat = fs.statSync(outputFile);
  const sourceFiles = ['index.ts', 'prototype.ts', 'console.ts'];

  for (const file of sourceFiles) {
    const sourcePath = path.join(ROOT, file);
    if (fs.existsSync(sourcePath)) {
      const sourceStat = fs.statSync(sourcePath);
      if (sourceStat.mtimeMs > outputStat.mtimeMs) {
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

  console.log('@kbn/security-hardening: building...');

  // Ensure target directory exists
  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  // Use esbuild to compile TypeScript to ESM JavaScript
  const esbuild = require('esbuild');

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'index.ts')],
    outfile: path.join(TARGET, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    sourcemap: true,
  });

  console.log('@kbn/security-hardening: build complete');
}

build().catch((err) => {
  console.error('@kbn/security-hardening: build failed', err);
  process.exit(1);
});
