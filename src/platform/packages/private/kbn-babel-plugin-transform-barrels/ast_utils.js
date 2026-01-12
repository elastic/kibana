/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @typedef {Object} ImportSpecifierInfo
 * @property {string} localName - The local binding name
 * @property {string} importedName - The imported name from the module
 * @property {boolean} isDefault - Whether this is a default import
 */

/**
 * @typedef {Object} ExportSpecifierInfo
 * @property {string} localName - The local name in the source module
 * @property {string} exportedName - The name to export as
 */

/**
 * Create an import declaration AST node.
 *
 * @param {typeof import('@babel/types')} t - Babel types
 * @param {ImportSpecifierInfo[]} specifiers - Import specifiers to create
 * @param {string} sourcePath - The import source path
 * @returns {import('@babel/types').ImportDeclaration}
 */
function createImportDeclaration(t, specifiers, sourcePath) {
  const importSpecifiers = specifiers.map((spec) => {
    if (spec.isDefault) {
      // import Foo from './source'
      return t.importDefaultSpecifier(t.identifier(spec.localName));
    } else if (spec.localName === spec.importedName) {
      // import { Foo } from './source'
      return t.importSpecifier(t.identifier(spec.localName), t.identifier(spec.importedName));
    } else {
      // import { Foo as Bar } from './source'
      return t.importSpecifier(t.identifier(spec.localName), t.identifier(spec.importedName));
    }
  });

  return t.importDeclaration(importSpecifiers, t.stringLiteral(sourcePath));
}

/**
 * Create an export named declaration AST node with a source.
 * e.g., export { Foo, Bar as Baz } from './source'
 *
 * @param {typeof import('@babel/types')} t - Babel types
 * @param {ExportSpecifierInfo[]} specifiers - Export specifiers to create
 * @param {string} sourcePath - The source path to export from
 * @returns {import('@babel/types').ExportNamedDeclaration}
 */
function createExportNamedDeclaration(t, specifiers, sourcePath) {
  const exportSpecifiers = specifiers.map((spec) => {
    // export { localName as exportedName } from 'source'
    return t.exportSpecifier(t.identifier(spec.localName), t.identifier(spec.exportedName));
  });

  return t.exportNamedDeclaration(null, exportSpecifiers, t.stringLiteral(sourcePath));
}

/**
 * Check if an import specifier is for a type-only import.
 *
 * @param {import('@babel/types').ImportSpecifier} specifier
 * @returns {boolean}
 */
function isTypeOnlyImport(specifier) {
  return specifier.importKind === 'type';
}

/**
 * Check if an export specifier is for a type-only export.
 *
 * @param {import('@babel/types').ExportSpecifier} specifier
 * @returns {boolean}
 */
function isTypeOnlyExport(specifier) {
  return specifier.exportKind === 'type';
}

module.exports = {
  createImportDeclaration,
  createExportNamedDeclaration,
  isTypeOnlyImport,
  isTypeOnlyExport,
};
