/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Peggy = require('@kbn/peggy');
const Crypto = require('crypto');

/** @type {import('@jest/transform').AsyncTransformer} */
module.exports = {
  canInstrument: false,

  getCacheKey(sourceText, sourcePath) {
    const config = Peggy.findConfigFile(sourcePath);
    return (
      Crypto.createHash('sha256').update(sourceText).digest('hex') +
      (!config ? '' : `-${Crypto.createHash('sha256').update(config.source).digest('hex')}`)
    );
  },

  process(sourceText, sourcePath) {
    return {
      code: Peggy.getJsSourceSync({
        content: sourceText,
        path: sourcePath,
        format: 'commonjs',
        optimize: 'speed',
      }).source,
    };
  },
};
