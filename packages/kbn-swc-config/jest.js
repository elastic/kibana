/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');

/**
 * @param {string} path
 * @returns {import('@swc/core').ParserConfig}
 */
function getJestParserConfig(path) {
  const ext = Path.extname(path);

  if (ext === '.js' || ext === '.mjs' || ext === '.jsx') {
    return { syntax: 'ecmascript', jsx: true, decorators: true };
  }

  return { syntax: 'typescript', tsx: ext === '.tsx', decorators: true };
}

/**
 * @param {string} path
 * @returns {import('@swc/core').Options}
 */
function getJestSwcConfig(path) {
  return {
    filename: path,
    swcrc: false,
    configFile: false,
    sourceMaps: true,
    inlineSourcesContent: true,
    module: { type: 'commonjs' },
    jsc: {
      parser: getJestParserConfig(path),
      target: 'es2022',
      keepClassNames: true,
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
        ...(Path.extname(path) === '.ts'
          ? {}
          : {
              react: {
                runtime: 'automatic',
                development: process.env.NODE_ENV !== 'production',
                importSource: '@emotion/react',
              },
            }),
      },
      // Keep helpers which define exports in the transformed module so the Jest transformer
      // can make those properties configurable for spies and module mocks.
      externalHelpers: false,
      experimental: {
        plugins: [
          [
            require.resolve('@swc/plugin-emotion'),
            {
              sourceMap: false,
              autoLabel: 'always',
              labelFormat: '[local]',
            },
          ],
        ],
      },
    },
  };
}

module.exports = { getJestSwcConfig, getJestParserConfig };
