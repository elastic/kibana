/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
// @ts-expect-error no types for this module
import moduleVisitor from 'eslint-module-utils/moduleVisitor';

type Importers =
  | TSESTree.ImportDeclaration
  | TSESTree.ExportNamedDeclaration
  | TSESTree.ExportAllDeclaration
  | TSESTree.CallExpression
  | TSESTree.ImportExpression
  | TSESTree.CallExpression;

type ImportVisitor = (req: string, node: Importers) => void;

/**
 * Create an ESLint rule visitor that calls visitor() for every import string, including
 * 'export from' statements, require() calls, jest.mock() calls, and more.
 */
export function visitAllImportStatements(visitor: ImportVisitor) {
  const baseWrapper = moduleVisitor(
    (reqNode: TSESTree.Literal, importer: Importers) => {
      const req = reqNode.value;
      if (typeof req !== 'string') {
        throw new Error('unable to read value of import request');
      }

      visitor(req, importer);
    },
    {
      esmodules: true,
      commonjs: true,
    }
  );

  const baseCallExpressionVisitor = baseWrapper.CallExpression;

  /**
   * wrapper around the base wrapper which also picks up calls to jest.<any>('../<any>' or '@kbn/<any>', ...) as "import statements"
   * @param {CallExpression} node
   */
  baseWrapper.CallExpression = (node: TSESTree.CallExpression) => {
    const { callee } = node;
    // is this call expression a represenation of an obj.method() call?
    if (callee.type === AST_NODE_TYPES.MemberExpression) {
      const { object } = callee;

      // is the object being called named "jest"?
      if (object.type === AST_NODE_TYPES.Identifier && object.name === 'jest') {
        const [path] = node.arguments;

        // is the first argument to the method a string which starts with '../' or '@kbn/'?
        if (
          path &&
          path.type === AST_NODE_TYPES.Literal &&
          typeof path.value === 'string' &&
          (path.value.startsWith('../') || path.value.startsWith('@kbn/'))
        ) {
          // call our visitor and assume this node represents a call to a jest mocking function and validate the relative path
          visitor(path.value, node);
        }

        return;
      }
    }

    return baseCallExpressionVisitor(node);
  };

  return baseWrapper;
}
