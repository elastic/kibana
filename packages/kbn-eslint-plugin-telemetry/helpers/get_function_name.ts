/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';

export function getFunctionName(func: TSESTree.FunctionDeclaration | TSESTree.Node): string {
  if (
    'id' in func &&
    func.id &&
    func.type === AST_NODE_TYPES.FunctionDeclaration &&
    func.id.type === AST_NODE_TYPES.Identifier
  ) {
    return func.id.name;
  }

  if (
    func.parent &&
    (func.parent.type !== AST_NODE_TYPES.VariableDeclarator ||
      func.parent.id.type !== AST_NODE_TYPES.Identifier)
  ) {
    return getFunctionName(func.parent);
  }

  if (func.parent?.id && 'name' in func.parent.id) {
    return func.parent.id.name;
  }

  return '';
}
