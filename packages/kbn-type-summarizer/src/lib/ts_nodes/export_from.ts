/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

export type ExportFromDeclaration = ts.ExportDeclaration & {
  moduleSpecifier: NonNullable<ts.ExportDeclaration['moduleSpecifier']>;
};

export function isExportFromDeclaration(node: ts.Node): node is ExportFromDeclaration {
  return ts.isExportDeclaration(node) && !!node.moduleSpecifier;
}
