/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
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
  overrides: [
    {
      exclude: require('@kbn/babel-preset/styled_components_files').USES_STYLED_COMPONENTS,
      presets: [
        [
          require.resolve('@emotion/babel-preset-css-prop'),
          {
            autoLabel: 'always',
            labelFormat: '[local]',
            sourceMap: false,
          },
        ],
      ],
    },
  ],
};
