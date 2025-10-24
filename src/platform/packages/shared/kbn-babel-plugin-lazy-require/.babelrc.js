/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Custom Babel config for the lazy-require plugin tests.
 * Uses the standard node preset WITHOUT the lazy-require plugin to avoid
 * transforming the plugin's test files.
 */

module.exports = {
  presets: [
    [
      require.resolve('@kbn/babel-preset/node_preset'),
      {
        '@babel/preset-env': {
          useBuiltIns: false,
          corejs: false,
        },
      },
    ],
  ],
};

