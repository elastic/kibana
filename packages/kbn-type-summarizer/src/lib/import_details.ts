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

/**
 * Indicates that the import was using `import * as X from 'y'` syntax
 */
export interface NamespaceImportDetails
  extends BaseImportDetails<ts.NamespaceImport | ts.NamespaceExport> {
  type: 'namespace';
}

/**
 * Indicates that the import was using `import X from 'y'` syntax
 */
export interface DefaultImportDetails extends BaseImportDetails<ts.ImportClause> {
  type: 'default';
}

/**
 * Indicates that the import was using `import { X } from 'y'` syntax, along
 * with the name of the imported value from the source module.
 */
export interface NamedImportDetails
  extends BaseImportDetails<ts.ImportSpecifier | ts.ExportSpecifier> {
  type: 'named';
  sourceName: string;
}

/**
 * The different types of ImportDetails that can be returned from `getImportDetails()`
 */
export type ImportDetails = NamespaceImportDetails | DefaultImportDetails | NamedImportDetails;

/**
 * Type guard for nodes which have a module specifier
 */
function hasModuleSpecifier<T extends ts.ImportDeclaration | ts.ExportDeclaration>(
  node: T
): node is T & { moduleSpecifier: ts.StringLiteral } {
  return !!(node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier));
}

/**
 * Determine the module request from a node which might have one, otherwise throw
 */
function getReq(node: ts.ImportDeclaration | ts.ExportDeclaration) {
  if (hasModuleSpecifier(node)) {
    return node.moduleSpecifier.text;
  }

  throw new Error(
    `syntax error, module specifier should be a string literal ${describeNode(node)}`
  );
}

/**
 * Given any node, determine if it represents a node that is related to an import statement
 * and determine the details about that import, including type, req, source name (for named imports)
 * and if the import is type-only.
 *
 * This also works to get the "import" details from `export ... from '...'` statements.
 */
export function getImportDetails(node: ts.Node): ImportDetails | undefined {
  // import { bar } from './bar'
  if (ts.isImportSpecifier(node)) {
    return {
      type: 'named',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      sourceName: node.propertyName?.text ?? node.name.text,
      req: getReq(node.parent.parent.parent),
      node,
    };
  }

  // `export { bar } from './bar'` or `export { x }`
  if (ts.isExportSpecifier(node)) {
    // if there isn't a related module specifier then this export isn't a type of "import"
    if (!node.parent.parent.moduleSpecifier) {
      return;
    }

    return {
      type: 'named',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      sourceName: node.propertyName?.text ?? node.name.text,
      req: getReq(node.parent.parent),
      node,
    };
  }

  // import Foo from 'foo'
  if (ts.isImportClause(node)) {
    return {
      type: 'default',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      req: getReq(node.parent),
      node,
    };
  }

  // import * as Foo from 'foo'
  if (ts.isNamespaceImport(node)) {
    return {
      type: 'namespace',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      req: getReq(node.parent.parent),
      node,
    };
  }

  // export * as Foo from 'foo'
  if (ts.isNamespaceExport(node)) {
    return {
      type: 'namespace',
      typesOnly: ts.isTypeOnlyImportOrExportDeclaration(node),
      req: getReq(node.parent),
      node,
    };
  }
}
