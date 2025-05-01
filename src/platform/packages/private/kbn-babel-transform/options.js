/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const NODE_PRESET = require.resolve('@kbn/babel-preset/node_preset');

const cwd = process.cwd();

/**
 * get the babel options for a specific path, path does not
 * exist, utit just might vary based on the file extension
 *
 * @param {string | undefined} path
 * @param {import('./types').TransformConfig} config
 * @returns {import('@babel/core').TransformOptions}
 */
function getBabelOptions(path, config = {}) {
  return {
    filename: path,
    presets: [NODE_PRESET],
    cwd,
    babelrc: false,
    sourceMaps: config.disableSourceMaps ? false : 'both',
    ast: false,
  };
}

/**
 *
 * @param {string} path
 * @param {import('./types').TransformConfig} config
 * @returns {import('@swc/core').Options}
 */
function getSwcOptions(path, config = {}) {
  const babelOptions = nullsAsUndefined(getBabelOptions(path, config));

  const isTypescript = path.endsWith('.ts') || path.endsWith('.tsx');

  return {
    cwd: babelOptions.cwd,
    swcrc: false,
    sourceMaps: babelOptions.sourceMaps === 'both' ? true : babelOptions.sourceMaps,
    filename: babelOptions.filename,
    jsc: {
      loose: true,
      target: 'es2015',
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
      parser: isTypescript
        ? {
            syntax: 'typescript',
            tsx: babelOptions.filename.endsWith('.tsx'),
          }
        : {
            syntax: 'ecmascript',
            jsx: true,
          },
    },
    module: {
      type: 'commonjs',
      strict: true,
      noInterop: false,
    },
  };
}

/**
 * @param {{[p: string]: any | null}} obj
 * @returns {{[p: string]: any}}
 */
function nullsAsUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value === null ? undefined : value])
  );
}

module.exports = { getBabelOptions, getSwcOptions };
