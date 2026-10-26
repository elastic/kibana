/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transform, browserslistToTargets } = require('lightningcss');
const browserslist = require('browserslist');

/** @type {Map<string, import('lightningcss').Targets>} */
const targetsByEnv = new Map();

/**
 * Webpack loader that prefixes (per .browserslistrc) and, in production, minifies CSS.
 * @this {import('webpack').LoaderContext<{}>}
 * @param {string | Buffer} source
 * @param {object | string | undefined} inputMap
 */
module.exports = function lightningcssLoader(source, inputMap) {
  const isProd = this.mode === 'production';
  const result = transform({
    filename: this.resourcePath,
    code: Buffer.from(source),
    minify: isProd,
    sourceMap: this.sourceMap,
    inputSourceMap: this.sourceMap ? serializeSourceMap(inputMap) : undefined,
    targets: getTargets(isProd ? 'production' : 'dev'),
  });

  this.callback(
    null,
    result.code.toString(),
    result.map ? JSON.parse(result.map.toString()) : undefined
  );
};

/**
 * Matches the env sections in .browserslistrc, like `browserslistEnv` in @kbn/babel-preset.
 * @param {'production' | 'dev'} env
 */
function getTargets(env) {
  if (!targetsByEnv.has(env)) {
    targetsByEnv.set(env, browserslistToTargets(browserslist(undefined, { path: __dirname, env })));
  }
  return targetsByEnv.get(env);
}

/** @param {object | string | undefined} inputMap */
function serializeSourceMap(inputMap) {
  if (typeof inputMap === 'string' || inputMap === undefined) {
    return inputMap;
  } else {
    return JSON.stringify(inputMap);
  }
}
