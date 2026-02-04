/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.resolve(ROOT, 'target');

// Check if we need to rebuild
function needsRebuild() {
  const indexJs = path.resolve(TARGET, 'index.js');
  if (!fs.existsSync(indexJs)) {
    return true;
  }

  // Check if any source file is newer than the output
  const outputMtime = fs.statSync(indexJs).mtime;

  function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'target' && entry.name !== 'node_modules' && entry.name !== 'scripts') {
          if (checkDir(fullPath)) return true;
        }
      } else if (entry.name.endsWith('.ts')) {
        const sourceMtime = fs.statSync(fullPath).mtime;
        if (sourceMtime > outputMtime) {
          return true;
        }
      }
    }
    return false;
  }

  return checkDir(ROOT);
}

async function build() {
  if (!needsRebuild()) {
    console.log('@kbn/vite-server: already built, skipping');
    return;
  }

  console.log('@kbn/vite-server: building...');

  // Ensure target directory exists
  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  try {
    // Use esbuild for fast compilation
    const esbuild = require('esbuild');

    // Build ES module only (Vite is ESM-only, so we can't build CJS)
    await esbuild.build({
      entryPoints: [path.resolve(ROOT, 'index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: path.resolve(TARGET, 'index.js'),
      sourcemap: true,
      external: [
        'vite',
        'vite/*',
        'vite/module-runner',
        'path',
        'fs',
        'url',
        'module',
        '@kbn/repo-info',
        '@kbn/repo-packages',
        '@kbn/vite-config',
        // Peer dependencies of @kbn/vite-config
        'peggy',
        'resolve',
        'resolve.exports',
      ],
    });

    // Generate TypeScript declarations using tsc
    try {
      execSync('npx tsc --emitDeclarationOnly --declaration --declarationMap --outDir target', {
        cwd: ROOT,
        stdio: 'inherit',
      });
    } catch (declError) {
      console.warn('@kbn/vite-server: TypeScript declaration generation had errors, continuing...');
    }

    console.log('@kbn/vite-server: build complete');
  } catch (error) {
    console.error('@kbn/vite-server: build failed:', error.message);
    process.exit(1);
  }
}

build();
