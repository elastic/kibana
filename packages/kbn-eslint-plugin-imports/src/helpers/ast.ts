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

type MaybeNode = SomeNode | null | undefined;
type NodeOfType<Type extends SomeNode['type']> = Extract<SomeNode, { type: Type }>;

export const isIdentifier = (node: MaybeNode): node is NodeOfType<'Identifier'> =>
  node?.type === 'Identifier';

export const isStringLiteral = (node: MaybeNode): node is ESTree.StringLiteral =>
  node?.type === 'Literal' && typeof node.value === 'string';

export const isTemplateLiteral = (node: MaybeNode): node is ESTree.TemplateLiteral =>
  node?.type === 'TemplateLiteral';

export const isCallExpression = (node: MaybeNode): node is ESTree.CallExpression =>
  node?.type === 'CallExpression';

export const isVariableDeclaration = (node: MaybeNode): node is ESTree.VariableDeclaration =>
  node?.type === 'VariableDeclaration';

export const isObjectPattern = (node: MaybeNode): node is ESTree.ObjectPattern =>
  node?.type === 'ObjectPattern';

export const isImportDeclaration = (node: MaybeNode): node is ESTree.ImportDeclaration =>
  node?.type === 'ImportDeclaration';

export const isExportNamedDeclaration = (node: MaybeNode): node is ESTree.ExportNamedDeclaration =>
  node?.type === 'ExportNamedDeclaration';

export const isImportSpecifier = (node: MaybeNode): node is ESTree.ImportSpecifier =>
  node?.type === 'ImportSpecifier';

export const isExportSpecifier = (node: MaybeNode): node is ESTree.ExportSpecifier =>
  node?.type === 'ExportSpecifier';

/** Type-only imports/exports are erased before anything runs, so runtime rules skip them */
export const isTypeOnlyImport = (importer: Importer): boolean => {
  if (isImportDeclaration(importer)) {
    return (
      importer.importKind === 'type' ||
      importer.specifiers.some((s) => isImportSpecifier(s) && s.importKind === 'type')
    );
  }

  if (isExportNamedDeclaration(importer)) {
    return (
      importer.exportKind === 'type' ||
      importer.specifiers.some((s) => isExportSpecifier(s) && s.exportKind === 'type')
    );
  }

  return false;
};
