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

module.exports = { getBabelOptions };
