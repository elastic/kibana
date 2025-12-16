'use strict';

/**
 * Create an import declaration AST node.
 *
 * @param {import('@babel/types')} t - Babel types
 * @param {Array<{localName: string, importedName: string, isDefault: boolean}>} specifiers
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
 * Check if an import specifier is for a type-only import.
 *
 * @param {import('@babel/types').ImportSpecifier} specifier
 * @returns {boolean}
 */
function isTypeOnlyImport(specifier) {
  return specifier.importKind === 'type';
}

module.exports = { createImportDeclaration, isTypeOnlyImport };

