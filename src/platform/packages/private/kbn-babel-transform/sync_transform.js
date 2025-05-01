/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const swc = require('@swc/core');
const babel = require('@babel/core');

const { getSwcOptions } = require('./options');
const { getBabelOptions } = require('./options');

/**
 * transform the source code at the given path with babel
 * using the standard configuration for the repository
 * @param {string} path
 * @param {string | undefined} source
 * @param {import('./types').TransformConfig} config
 * @returns
 */
function transformCode(path, source, config = {}) {
  const useSwc = config.useSwc;
  let result;
  if (useSwc) {
    const swcOptions = getSwcOptions(path, config);
    result =
      source === undefined
        ? swc.transformFileSync(path, swcOptions)
        : swc.transformSync(source, swcOptions);
  } else {
    const options = getBabelOptions(path, config);
    result =
      source === undefined
        ? babel.transformFileSync(path, options)
        : babel.transformSync(source, options);
  }

  if (!result || !result.code) {
    throw new Error(`babel failed to transpile [${path}]`);
  }

  return {
    code: result.code,
    map: result.map,
  };
}

module.exports = { transformCode };
