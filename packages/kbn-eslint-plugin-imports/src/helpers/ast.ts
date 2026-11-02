/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESTree } from '@oxlint/plugins';

/**
 * The rules in this package run in Oxlint, and in ESLint's RuleTester through `eslintCompatPlugin`.
 * Oxlint, @typescript-eslint/parser and @babel/eslint-parser all produce ESTree-compatible ASTs.
 */
export type SomeNode = ESTree.Node;

export type Importer =
  | ESTree.ImportDeclaration
  | ESTree.ExportNamedDeclaration
  | ESTree.ExportAllDeclaration
  | ESTree.CallExpression
  | ESTree.ImportExpression;

/** `Literal` covers every literal value, so the `type` check alone doesn't narrow to a string */
export const isStringLiteral = (node: SomeNode): node is ESTree.StringLiteral =>
  node.type === 'Literal' && typeof node.value === 'string';

/** Type-only imports/exports are erased before anything runs, so runtime rules skip them */
export const isTypeOnlyImport = (importer: Importer): boolean => {
  if (importer.type === 'ImportDeclaration') {
    return (
      importer.importKind === 'type' ||
      importer.specifiers.some((s) => s.type === 'ImportSpecifier' && s.importKind === 'type')
    );
  }

  if (importer.type === 'ExportNamedDeclaration') {
    return (
      importer.exportKind === 'type' ||
      importer.specifiers.some((s) => s.type === 'ExportSpecifier' && s.exportKind === 'type')
    );
  }

  return false;
};
