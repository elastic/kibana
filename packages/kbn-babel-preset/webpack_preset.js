/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const usesStyledComponents = [
  /src[\/\\]plugins[\/\\](data|kibana_react)[\/\\]/,
  /x-pack[\/\\]plugins[\/\\](apm|beats_management|fleet|infra|lists|observability|osquery|security_solution|uptime)[\/\\]/,
  /x-pack[\/\\]test[\/\\]plugin_functional[\/\\]plugins[\/\\]resolver_test[\/\\]/,
];

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
        include: usesStyledComponents,
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
        exclude: usesStyledComponents,
        presets: [
          [
            require.resolve('@emotion/babel-preset-css-prop'),
            {
              labelFormat: '[local]',
            },
          ],
        ],
      },
    ],
  };
};
