/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

export type ValueNode =
  | ts.ClassDeclaration
  | ts.FunctionDeclaration
  | ts.TypeAliasDeclaration
  | ts.VariableDeclaration
  | ts.InterfaceDeclaration;

export function isExportedValueNode(node: ts.Node): node is ValueNode {
  return (
    node.kind === ts.SyntaxKind.ClassDeclaration ||
    node.kind === ts.SyntaxKind.FunctionDeclaration ||
    node.kind === ts.SyntaxKind.TypeAliasDeclaration ||
    node.kind === ts.SyntaxKind.VariableDeclaration ||
    node.kind === ts.SyntaxKind.InterfaceDeclaration
  );
}
export function assertExportedValueNode(node: ts.Node): asserts node is ValueNode {
  if (!isExportedValueNode(node)) {
    const kind = findKind(node);
    throw new Error(`not a valid ExportedValueNode [kind=${kind}]`);
  }
}
export function toExportedNodeValue(node: ts.Node): ValueNode {
  assertExportedValueNode(node);
  return node;
}

export function findKind(node: ts.Node) {
  for (const [name, value] of Object.entries(ts.SyntaxKind)) {
    if (node.kind === value) {
      return name;
    }
  }

  throw new Error('node.kind is not in the SyntaxKind map');
}

export type DecSymbol = ts.Symbol & {
  declarations: NonNullable<ts.Symbol['declarations']>;
};
export function isDecSymbol(symbol: ts.Symbol): symbol is DecSymbol {
  return !!symbol.declarations;
}
export function assertDecSymbol(symbol: ts.Symbol): asserts symbol is DecSymbol {
  if (!isDecSymbol(symbol)) {
    throw new Error('symbol has no declarations');
  }
}
export function toDecSymbol(symbol: ts.Symbol): DecSymbol {
  assertDecSymbol(symbol);
  return symbol;
}

export type ExportFromDeclaration = ts.ExportDeclaration & {
  moduleSpecifier: NonNullable<ts.ExportDeclaration['moduleSpecifier']>;
};
export function isExportFromDeclaration(node: ts.Node): node is ExportFromDeclaration {
  return ts.isExportDeclaration(node) && !!node.moduleSpecifier;
}

export function isAliasSymbol(symbol: ts.Symbol) {
  return symbol.flags & ts.SymbolFlags.Alias;
}
