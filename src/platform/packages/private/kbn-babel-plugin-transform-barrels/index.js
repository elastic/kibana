/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transformImportDeclaration } = require('./transformer');

/**
 * Babel plugin that transforms barrel imports to direct imports.
 *
 * @param {{ types: import('@babel/types') }} babel
 * @returns {import('@babel/core').PluginObj}
 */
module.exports = function barrelTransformPlugin({ types: t }) {
  return {
    name: 'kbn-transform-barrels',

    visitor: {
      ImportDeclaration(nodePath, state) {
        // Get barrel index from plugin options
        const { barrelIndex } = state.opts;

        // NO-OP if barrelIndex is not provided
        // This happens in contexts where the precache wasn't built
        // (e.g., kbn-babel-register, copy_source_worker)
        if (!barrelIndex) {
          return;
        }

        transformImportDeclaration(nodePath, state, t, barrelIndex);
      },
    },
  };
};
