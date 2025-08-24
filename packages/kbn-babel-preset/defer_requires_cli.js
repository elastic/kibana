/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Tiny CLI to transform a file or inline source with the defer_requires plugin or with the node preset.
 *
 * Usage:
 *   node defer_requires_cli.js <input-file>
 *   node defer_requires_cli.js --node-preset <input-file>
 *   node defer_requires_cli.js --code "const x = require('y')"
 *
 * Set KBN_DEBUG_DEFER_REQUIRE to a comma/colon/semicolon-separated list of substrings to print transformed
 * output for matching files during plugin execution.
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const args = process.argv.slice(2);
const useNodePreset = args[0] === '--node-preset';
const codeFlagIndex = args.indexOf('--code');

async function run() {
  if (codeFlagIndex >= 0) {
    const code = args[codeFlagIndex + 1];
    if (!code) {
      console.error('Missing code after --code');
      process.exit(1);
    }
    const plugin = require('./defer_requires');
    const result = await babel.transformAsync(code, {
      filename: 'inline.js',
      sourceType: 'script',
      plugins: [[plugin, {}]],
      babelrc: false,
      configFile: false,
      generatorOpts: { compact: false },
      comments: true,
      retainLines: false,
      parserOpts: {
        sourceType: 'script',
        allowAwaitOutsideFunction: true,
        plugins: [
          'jsx',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
          'typescript',
          'decorators-legacy',
        ],
      },
    });
    process.stdout.write(result.code + (result.code.endsWith('\n') ? '' : '\n'));
    return;
  }

  const inputFile = path.resolve(process.cwd(), useNodePreset ? args[1] : args[0] || '');
  if (!inputFile) {
    console.error('Usage: defer_requires_cli [--node-preset] <inputFile> | --code "<src>"');
    process.exit(1);
  }
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const source = fs.readFileSync(inputFile, 'utf8');

  if (useNodePreset) {
    const nodePreset = require('./node_preset');
    const result = await babel.transformAsync(source, {
      filename: inputFile,
      sourceType: 'module',
      babelrc: false,
      configFile: false,
      presets: [[nodePreset, {}]],
      generatorOpts: { compact: false },
      comments: true,
      retainLines: false,
    });
    process.stdout.write(result.code + (result.code.endsWith('\n') ? '' : '\n'));
    return;
  }

  const isTS = /\.(ts|tsx)$/.test(inputFile);
  const tsPreset = [
    '@babel/preset-typescript',
    {
      allowNamespaces: true,
      allowDeclareFields: true,
    },
  ];
  const presets = isTS ? [tsPreset] : [];

  const plugin = require('./defer_requires');
  const result = await babel.transformAsync(source, {
    filename: inputFile,
    sourceType: 'script',
    plugins: [[plugin, {}]],
    presets,
    parserOpts: {
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      plugins: [
        'jsx',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
        'typescript',
        'decorators-legacy',
      ],
    },
    generatorOpts: { compact: false },
    ast: true,
    code: true,
    babelrc: false,
    configFile: false,
    comments: true,
    retainLines: false,
  });

  process.stdout.write(result.code + (result.code.endsWith('\n') ? '' : '\n'));
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
