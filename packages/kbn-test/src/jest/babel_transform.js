/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
  presets: [
    [
      require.resolve('@kbn/babel-preset/node_preset'),
      {
        '@babel/preset-env': {
          // disable built-in filtering, which is more performant but strips the import of `regenerator-runtime` required by EUI
          useBuiltIns: false,
          corejs: false,
        },
      },
    ],
  ],
});
