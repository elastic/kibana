/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type * as T from '@babel/types';

/**
 * The rules in this package run under both @typescript-eslint/parser and
 * @babel/eslint-parser, so any node can come from either AST. Those two node
 * unions are not assignable to each other, which rules out the `isX()` guards
 * from @babel/types: they only accept babel nodes. Both ASTs discriminate on a
 * `type` string and that string is all the babel guards compare at runtime, so
 * the predicates below compare it directly and narrow to either AST.
 */
export type SomeNode = TSESTree.Node | T.Node;

export type Importer =
  | TSESTree.ImportDeclaration
  | T.ImportDeclaration
  | TSESTree.ExportNamedDeclaration
  | T.ExportNamedDeclaration
  | TSESTree.ExportAllDeclaration
  | T.ExportAllDeclaration
  | TSESTree.CallExpression
  | T.CallExpression
  | TSESTree.ImportExpression;

type MaybeNode = SomeNode | null | undefined;

const typeOf = (node: MaybeNode): string | undefined => node?.type;

export const isIdentifier = (node: MaybeNode): node is TSESTree.Identifier | T.Identifier =>
  typeOf(node) === 'Identifier';

export const isStringLiteral = (
  node: MaybeNode
): node is TSESTree.StringLiteral | T.StringLiteral =>
  typeOf(node) === 'StringLiteral' ||
  (!!node && node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string');

export const isTemplateLiteral = (
  node: MaybeNode
): node is TSESTree.TemplateLiteral | T.TemplateLiteral => typeOf(node) === 'TemplateLiteral';

/** babel's AST models the callee of an `import()` call as a node type of its own */
export const isImportCallee = (node: MaybeNode): node is T.Import => typeOf(node) === 'Import';

export const isCallExpression = (
  node: MaybeNode
): node is TSESTree.CallExpression | T.CallExpression => typeOf(node) === 'CallExpression';

export const isVariableDeclaration = (
  node: MaybeNode
): node is TSESTree.VariableDeclaration | T.VariableDeclaration =>
  typeOf(node) === 'VariableDeclaration';

export const isObjectPattern = (
  node: MaybeNode
): node is TSESTree.ObjectPattern | T.ObjectPattern => typeOf(node) === 'ObjectPattern';

export const isImportDeclaration = (
  node: MaybeNode
): node is TSESTree.ImportDeclaration | T.ImportDeclaration => typeOf(node) === 'ImportDeclaration';

export const isExportNamedDeclaration = (
  node: MaybeNode
): node is TSESTree.ExportNamedDeclaration | T.ExportNamedDeclaration =>
  typeOf(node) === 'ExportNamedDeclaration';

export const isImportSpecifier = (
  node: MaybeNode
): node is TSESTree.ImportSpecifier | T.ImportSpecifier => typeOf(node) === 'ImportSpecifier';

export const isExportSpecifier = (
  node: MaybeNode
): node is TSESTree.ExportSpecifier | T.ExportSpecifier => typeOf(node) === 'ExportSpecifier';

/** Type-only imports/exports are erased before anything runs, so runtime rules skip them */
export const isTypeOnlyImport = (importer: Importer): boolean => {
  if (isImportDeclaration(importer)) {
    const specifiers: SomeNode[] = importer.specifiers;
    return (
      importer.importKind === 'type' ||
      specifiers.some((s) => isImportSpecifier(s) && s.importKind === 'type')
    );
  }

  if (isExportNamedDeclaration(importer)) {
    const specifiers: SomeNode[] = importer.specifiers;
    return (
      importer.exportKind === 'type' ||
      specifiers.some((s) => isExportSpecifier(s) && s.exportKind === 'type')
    );
  }

  return false;
};
