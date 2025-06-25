/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const EXTENSIONS_TO_STRIP = ['.text'];
const REPLACEMENT = '';

/**
 * Strips extensions from files. This is needed for .text files, which are compiled to
 * CommonJS (with a .js extension). As TypeScript does not follow extension-less
 * imports unless it is part of a hard-coded list (.ts,.tsx,.js etc), at edit time,
 * they still need to be imported as .text, but as they're compiled to JavaScript,
 * importing `./my_file.text` will no longer work. Changing it to `./my_file` does
 * work, as that will be resolved to `./my_file.js`.
 */
module.exports = function stripExtensionsPlugin({ types: t }) {
  /**
   * @param {import('@babel/traverse').NodePath<import('@babel/types').StringLiteral>} sourcePath
   * @param {string[]} exts
   * @param {string} replacement
   */
  function maybeRewriteSource(sourcePath, exts, replacement) {
    if (!sourcePath || !sourcePath.node || !sourcePath.isStringLiteral()) {
      return;
    }

    const value = sourcePath.node.value;
    const match = exts.find((e) => value.endsWith(e));
    if (!match) return;

    const newValue = value.slice(0, -match.length) + replacement;
    if (newValue !== value) {
      sourcePath.replaceWith(t.stringLiteral(newValue));
    }
  }

  return {
    name: 'strip-extensions',
    visitor: {
      ImportDeclaration(path) {
        maybeRewriteSource(path.get('source'), EXTENSIONS_TO_STRIP, REPLACEMENT);
      },
    },
  };
};
