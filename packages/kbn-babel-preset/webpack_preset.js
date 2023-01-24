/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { USES_STYLED_COMPONENTS } = require('./styled_components_files');

/** @type {import('@babel/core').ConfigFunction} */
module.exports = (api, options = {}) => {
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          useBuiltIns: 'entry',
          modules: false,
          // Please read the explanation for this
          // in node_preset.js
          corejs: '3.27.1',
          bugfixes: true,
          browserslistEnv: api.env('production') ? 'production' : 'dev',
        },
      ],
      [require('./common_preset'), options],
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
    overrides: [
      {
        include: USES_STYLED_COMPONENTS,
        plugins: [
          [
            require.resolve('babel-plugin-styled-components'),
            {
              fileName: false,
            },
          ],
        ],
      },
      {
        exclude: USES_STYLED_COMPONENTS,
        presets: [
          [
            require.resolve('@emotion/babel-preset-css-prop'),
            {
              labelFormat: '[filename]--[local]',
            },
          ],
        ],
      },
    ],
  };
};
