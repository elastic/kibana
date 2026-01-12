/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  transformImportDeclaration,
  transformExportNamedDeclaration,
  transformExportAllDeclaration,
} = require('./transformer');

/**
 * Babel plugin that transforms barrel imports and re-exports to direct paths.
 *
 * @param {{ types: typeof import('@babel/types') }} babel
 * @returns {import('@babel/core').PluginObj<import('@babel/core').PluginPass & { opts: import('./types').PluginOptions }>}
 */
module.exports = function barrelTransformPlugin({ types: t }) {
  return {
    name: 'kbn-transform-barrels',

    visitor: {
      ImportDeclaration(nodePath, state) {
        const { barrelIndex } = state.opts;
        if (!barrelIndex) return;
        transformImportDeclaration(nodePath, state, t, barrelIndex);
      },

      ExportNamedDeclaration(nodePath, state) {
        const { barrelIndex } = state.opts;
        if (!barrelIndex) return;
        if (!nodePath.node.source) return;
        transformExportNamedDeclaration(nodePath, state, t, barrelIndex);
      },

      ExportAllDeclaration(nodePath, state) {
        const { barrelIndex } = state.opts;
        if (!barrelIndex) return;
        transformExportAllDeclaration(nodePath, state, t, barrelIndex);
      },
    },
  };
};
