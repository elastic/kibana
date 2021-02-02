/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

module.exports = () => {
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          useBuiltIns: 'entry',
          modules: false,
          // Please read the explanation for this
          // in node_preset.js
          corejs: '3.2.1',
        },
      ],
      require('./common_preset'),
    ],
    plugins: [
      [
        require.resolve('babel-plugin-styled-components'),
        {
          fileName: false,
        },
      ],
    ],
    env: {
      production: {
        plugins: [
          [
            require.resolve('babel-plugin-transform-react-remove-prop-types'),
            {
              mode: 'remove',
              removeImport: true,
            },
          ],
        ],
      },
    },
  };
};
