/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const Peggy = require('@kbn/peggy');
const Crypto = require('crypto');

/**
 * Resolve grammar path to absolute so findConfigFile can locate .config.json
 * next to the grammar (important when Jest passes a path relative to rootDir).
 */
function resolveGrammarPath(sourcePath, transformOptions) {
  if (Path.isAbsolute(sourcePath)) {
    return sourcePath;
  }
  const rootDir =
    transformOptions?.config?.rootDir ?? transformOptions?.config?.projectConfig?.rootDir;
  return Path.resolve(rootDir || process.cwd(), sourcePath);
}

/** @type {import('@jest/transform').AsyncTransformer} */
module.exports = {
  canInstrument: false,

  getCacheKey(sourceText, sourcePath, transformOptions) {
    const resolvedPath = resolveGrammarPath(sourcePath, transformOptions);
    const config = Peggy.findConfigFile(resolvedPath);
    return (
      Crypto.createHash('sha256').update(sourceText).digest('hex') +
      (!config ? '' : `-${Crypto.createHash('sha256').update(config.source).digest('hex')}`)
    );
  },

  process(sourceText, sourcePath, transformOptions) {
    const resolvedPath = resolveGrammarPath(sourcePath, transformOptions);
    return {
      code: Peggy.getJsSourceSync({
        content: sourceText,
        path: resolvedPath,
        format: 'commonjs',
        optimize: 'speed',
      }).source,
    };
  },
};
