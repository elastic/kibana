/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

import { describeNode } from '@kbn/type-summarizer-core';

interface BaseImportDetails<T extends ts.Node> {
  typesOnly: boolean;
  req: string;
  node: T;
}

export interface NamespaceImportDetails
  extends BaseImportDetails<ts.NamespaceImport | ts.NamespaceExport> {
  type: 'namespace';
}

export interface DefaultImportDetails extends BaseImportDetails<ts.ImportClause> {
  type: 'default';
}

export interface NamedImportDetails
  extends BaseImportDetails<ts.ImportSpecifier | ts.ExportSpecifier> {
  type: 'named';
  sourceName: string;
}

export type ImportDetails = NamespaceImportDetails | DefaultImportDetails | NamedImportDetails;

function hasModuleSpecifier<T extends ts.ImportDeclaration | ts.ExportDeclaration>(
  node: T
): node is T & { moduleSpecifier: ts.StringLiteral } {
  return !!(node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier));
}

function getModuleSpecifier(node: ts.ImportDeclaration | ts.ExportDeclaration) {
  if (hasModuleSpecifier(node)) {
    return node.moduleSpecifier.text;
  }

  throw new Error(
    `syntax error, module specifier should be a string literal ${describeNode(node)}`
  );
}

export function getImportDetails(node: ts.Node): ImportDetails | undefined {
  // import { bar } from './bar'
  if (ts.isImportSpecifier(node)) {
    return {
      type: 'named',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      sourceName: node.propertyName?.text ?? node.name.text,
      req: getModuleSpecifier(node.parent.parent.parent),
      node,
    };
  }

  // `export { bar } from './bar'` or `export { x }`
  if (ts.isExportSpecifier(node)) {
    if (!node.parent.parent.moduleSpecifier) {
      return;
    }

    return {
      type: 'named',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      sourceName: node.propertyName?.text ?? node.name.text,
      req: getModuleSpecifier(node.parent.parent),
      node,
    };
  }

  // import Foo from 'foo'
  if (ts.isImportClause(node)) {
    return {
      type: 'default',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      req: getModuleSpecifier(node.parent),
      node,
    };
  }

  // import * as Foo from 'foo'
  if (ts.isNamespaceImport(node)) {
    return {
      type: 'namespace',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      req: getModuleSpecifier(node.parent.parent),
      node,
    };
  }

  // export * as Foo from 'foo'
  if (ts.isNamespaceExport(node)) {
    return {
      type: 'namespace',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      req: getModuleSpecifier(node.parent),
      node,
    };
  }

  // if (
  //   !node.getSourceFile().fileName.includes('/typescript/') &&
  //   !node.getSourceFile().fileName.includes('@types/node')
  // ) {
  //   debugger;
  // }
}
