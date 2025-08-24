#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Tiny CLI to transform a file with the inline imports/exports plugin or presets.
// Usage:
//   node inline_imports_and_exports_cli.js /path/to/file.ts[x]
//   node inline_imports_and_exports_cli.js --node-preset /path/to/file.ts[x]

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const args = process.argv.slice(2);
const useNodePreset = args[0] === '--node-preset';
const inputFile = path.resolve(process.cwd(), useNodePreset ? args[1] : args[0] || '');
if (!inputFile) {
  console.error('Usage: inline_imports_and_exports_cli [--node-preset] <inputFile>');
  process.exit(1);
}

const absInput = inputFile;
if (!absInput || !fs.existsSync(absInput)) {
  console.error(`Input file not found: ${absInput}`);
  process.exit(1);
}

const plugin = require('./inline_imports_and_exports');
const nodePreset = require('./node_preset');

function run() {
  const source = fs.readFileSync(absInput, 'utf8');
  const isTS = /\.(ts|tsx)$/.test(absInput);
  const parserPlugins = ['jsx'];
  if (isTS) parserPlugins.push('typescript', 'decorators-legacy');

  const result = babel.transformSync(source, useNodePreset
    ? {
      filename: absInput,
      sourceType: 'module',
      babelrc: false,
      configFile: false,
      presets: [[nodePreset, {}]],
      generatorOpts: { compact: false },
      comments: true,
      retainLines: false,
    }
    : {
      filename: absInput,
      sourceType: 'module',
      plugins: [[plugin, { enabled: true }], ['@babel/plugin-syntax-jsx']],
      presets: isTS
        ? [
          [
            '@babel/preset-typescript',
            {
              allowNamespaces: true,
              allowDeclareFields: true,
            },
          ],
        ]
        : [],
      parserOpts: {
        sourceType: 'module',
        plugins: parserPlugins,
      },
      generatorOpts: { compact: false },
      ast: true,
      code: true,
      babelrc: false,
      configFile: false,
      comments: true,
      retainLines: false,
    }
  );

  process.stdout.write(result.code + (result.code.endsWith('\n') ? '' : '\n'));
}

run();
