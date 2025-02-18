/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { USES_STYLED_COMPONENTS } = require('./styled_components_files');

/** @type {import('@babel/core').ConfigFunction} */
module.exports = (
  api,
  options = {
    useTransformRequireDefault: false,
  }
) => {
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          useBuiltIns: 'entry',
          modules: false,
          // Please read the explanation for this
          // in node_preset.js
          corejs: '3.37.1',
          bugfixes: true,
          browserslistEnv: api.env('production') ? 'production' : 'dev',
        },
      ],
      [require('./common_preset'), options],
    ],
    plugins: [
      // Conditionally include babel-plugin-transform-require-default
      //
      // We need to include this plugin in the main worker webpack config that handles our
      // non node modules code base in order to support resolving esm
      // as a priority over cjs (if that's defined in the mainFields). Without that we might run into
      // cases where we have a repo wide cjs code that requires an esm module (coming from the ui-shared-deps that also prioritizes esm)
      // which will not be applying the .default key in the require itself.
      ...(options.useTransformRequireDefault
        ? [require.resolve('babel-plugin-transform-require-default')]
        : []),
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
