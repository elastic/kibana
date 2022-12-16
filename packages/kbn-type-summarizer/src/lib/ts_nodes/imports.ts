/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { describeNode } from '@kbn/type-summarizer-core';

export interface ImportDescriptor {
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
  moduleSpecifier: string;
}

export function getImportDescriptor(
  specifier: ts.ImportSpecifier | ts.ExportSpecifier
): ImportDescriptor | undefined {
  const declaration = ts.isImportSpecifier(specifier)
    ? // import specifiers are always within NamedImports nodes
      //    which are always with ImportClause nodes
      //       which are always within ImportDeclaration nodes
      specifier.parent.parent.parent
    : // export specifiers are always within NamedExports nodes
      //    which are always within ExportDeclaration nodes
      specifier.parent.parent;

  if (declaration.moduleSpecifier && ts.isStringLiteral(declaration.moduleSpecifier)) {
    return {
      declaration,
      moduleSpecifier: declaration.moduleSpecifier.text,
    };
  }

  if (ts.isImportDeclaration(declaration) && !ts.isStringLiteral(declaration.moduleSpecifier)) {
    throw new Error(
      `SyntaxError: ImportDeclaration.moduleSpecifier must be a string literal ${describeNode(
        declaration
      )}`
    );
  }

  return undefined;
}
