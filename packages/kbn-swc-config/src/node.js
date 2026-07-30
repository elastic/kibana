/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { getSharedConfig } = require('@kbn/transpiler-config');

/**
 * Get SWC configuration for Node.js server-side builds.
 *
 * @param {{ production?: boolean }} options
 */
function getNodeSwcConfig(options = {}) {
  const { production = false } = options;
  const sharedConfig = getSharedConfig();

  return {
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true,
        decorators: true,
      },
      transform: {
        legacyDecorator: sharedConfig.typescript.decoratorsLegacy,
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
      ignoreDynamic: true,
    },
    minify: false,
  };
}

module.exports = { getNodeSwcConfig };
