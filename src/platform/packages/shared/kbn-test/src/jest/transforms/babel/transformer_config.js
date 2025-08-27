/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = (overrides = {}) => {
  const nodePresetOptions = {
    '@babel/preset-env': {
      // disable built-in filtering, which is more performant but strips the import of `regenerator-runtime` required by EUI
      useBuiltIns: false,
      corejs: false,
    },
    defer_requires: {
      enabled: false,
    },
    ...overrides,
  };

  return {
    presets: [[require.resolve('@kbn/babel-preset/node_preset'), nodePresetOptions]],
    plugins: [],
    overrides: [
      {
        exclude: require('@kbn/babel-preset/styled_components_files').USES_STYLED_COMPONENTS,
      },
    ],
  };
};
