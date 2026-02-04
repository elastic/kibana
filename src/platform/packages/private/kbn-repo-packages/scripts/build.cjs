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
 * Check if a rebuild is needed
 */
function needsRebuild() {
  const outputFile = path.join(TARGET, 'index.js');
  if (!fs.existsSync(outputFile)) {
    return true;
  }

  const outputStat = fs.statSync(outputFile);
  const dirs = ['.', 'modern', 'utils', 'legacy'];

  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (item.endsWith('.js') && item !== 'jest.config.js') {
        const filePath = path.join(dirPath, item);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs > outputStat.mtimeMs) {
          return true;
        }
      }
    }
  }

  return false;
}

async function build() {
  if (!needsRebuild()) {
    return;
  }

  console.log('@kbn/repo-packages: building...');

  // Ensure target directory exists
  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  const esbuild = require('esbuild');

  // Calculate the package root path relative to the built output
  // The built file will be at target/index.js
  // The package-map.json is at the package root (one level up from target)
  const packageRootRelative = '..';

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'index.js')],
    outfile: path.join(TARGET, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs', // CommonJS for backwards compatibility with require()
    sourcemap: true,
    // Keep Node.js built-ins external
    external: ['fs', 'path', 'crypto', 'url', 'module', 'util', 'child_process'],
    banner: {
      js: `
// Package root is one level up from target/
const __packageRoot = require('path').resolve(__dirname, '..');
`,
    },
    // Plugin to rewrite __dirname references in package-map.json path
    plugins: [
      {
        name: 'fix-package-map-path',
        setup(build) {
          // Transform the source to use __packageRoot for PACKAGE_MAP_PATH
          build.onLoad({ filter: /get_packages\.js$/ }, async (args) => {
            let contents = fs.readFileSync(args.path, 'utf8');
            // Replace the PACKAGE_MAP_PATH definition to use __packageRoot
            contents = contents.replace(
              /const PACKAGE_MAP_PATH = Path\.resolve\(__dirname, '\.\.\/package-map\.json'\);/,
              `const PACKAGE_MAP_PATH = typeof __packageRoot !== 'undefined' 
                ? require('path').resolve(__packageRoot, 'package-map.json')
                : Path.resolve(__dirname, '../package-map.json');`
            );
            return { contents, loader: 'js' };
          });
        },
      },
    ],
  });

  console.log('@kbn/repo-packages: build complete');
}

build().catch((err) => {
  console.error('@kbn/repo-packages: build failed', err);
  process.exit(1);
});
