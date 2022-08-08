/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { describeNode, hasIdentifierName } from '@kbn/type-summarizer-core';

export type ExportableDec = (
  | ts.ClassDeclaration
  | ts.FunctionDeclaration
  | ts.TypeAliasDeclaration
  | ts.VariableDeclaration
  | ts.InterfaceDeclaration
  | ts.EnumDeclaration
  | ts.ModuleDeclaration
) & { name: ts.Identifier };

export function isExportableDec(node: ts.Node): node is ExportableDec {
  return (
    (node.kind === ts.SyntaxKind.ClassDeclaration ||
      node.kind === ts.SyntaxKind.FunctionDeclaration ||
      node.kind === ts.SyntaxKind.TypeAliasDeclaration ||
      node.kind === ts.SyntaxKind.VariableDeclaration ||
      node.kind === ts.SyntaxKind.InterfaceDeclaration ||
      node.kind === ts.SyntaxKind.EnumDeclaration ||
      node.kind === ts.SyntaxKind.ModuleDeclaration) &&
    hasIdentifierName(node)
  );
}

export function assertExportableDec(node: ts.Node): asserts node is ExportableDec {
  if (!isExportableDec(node)) {
    throw new Error(`not a valid ExportableDec ${describeNode(node)}`);
  }
}

export function toExportableDec(node: ts.Node): ExportableDec {
  assertExportableDec(node);
  return node;
}

export function isTypeDeclaration(dec: ExportableDec) {
  return (
    ts.isInterfaceDeclaration(dec) ||
    ts.isTypeAliasDeclaration(dec) ||
    ts.isEnumDeclaration(dec) ||
    ts.isModuleDeclaration(dec)
  );
}
