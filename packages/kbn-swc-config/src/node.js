/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { getNodeRegisterParserConfig } = require('./node_register');

/**
 * Get SWC configuration for Node.js server-side builds. Must stay loadable
 * without a runtime transpiler, so it cannot require `@kbn/transpiler-config`.
 *
 * @param {string} path
 * @param {{ production?: boolean }} [options]
 * @returns {import('@swc/core').Options}
 */
function getNodeSwcConfig(path, options = {}) {
  const { production = false } = options;

  return {
    filename: path,
    swcrc: false,
    configFile: false,
    jsc: {
      parser: getNodeRegisterParserConfig(path),
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
      target: 'es2022',
      keepClassNames: true,
      externalHelpers: true,
    },
    sourceMaps: production ? false : 'inline',
    inlineSourcesContent: !production,
    module: {
      type: 'commonjs',
    },
    minify: false,
  };
}

module.exports = { getNodeSwcConfig };
