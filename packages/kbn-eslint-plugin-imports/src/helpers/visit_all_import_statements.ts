/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule } from 'eslint';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import * as T from '@babel/types';
import { ImportType } from '@kbn/import-resolver';

const JEST_MODULE_METHODS = [
  'jest.createMockFromModule',
  'jest.mock',
  'jest.unmock',
  'jest.doMock',
  'jest.dontMock',
  'jest.setMock',
  'jest.requireActual',
  'jest.requireMock',
];

export type SomeNode = TSESTree.Node | T.Node;

type Visitor = (req: string | null, node: SomeNode, type: ImportType) => void;

const isIdent = (node: SomeNode): node is TSESTree.Identifier | T.Identifier =>
  T.isIdentifier(node) || node.type === AST_NODE_TYPES.Identifier;

const isStringLiteral = (node: SomeNode): node is TSESTree.StringLiteral | T.StringLiteral =>
  T.isStringLiteral(node) ||
  (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string');

const isTemplateLiteral = (node: SomeNode): node is TSESTree.TemplateLiteral | T.TemplateLiteral =>
  T.isTemplateLiteral(node) || node.type === AST_NODE_TYPES.TemplateLiteral;

function passSourceAsString(source: SomeNode | null | undefined, type: ImportType, fn: Visitor) {
  if (!source) {
    return;
  }

  if (isStringLiteral(source)) {
    return fn(source.value, source, type);
  }

  if (isTemplateLiteral(source)) {
    if (source.expressions.length) {
      return null;
    }

    return fn(
      [...source.quasis].reduce((acc, q) => acc + q.value.raw, ''),
      source,
      type
    );
  }

  return fn(null, source, type);
}

/**
 * Create an ESLint rule visitor that calls fn() for every import string, including
 * 'export from' statements, require() calls, require.resolve(), jest.mock() calls, and more.
 * Works with both babel eslint and typescript-eslint parsers
 */
export function visitAllImportStatements(fn: Visitor) {
  const visitor = {
    ImportDeclaration(node: TSESTree.ImportDeclaration | T.ImportDeclaration) {
      passSourceAsString(node.source, 'esm', fn);
    },
    ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration | T.ExportNamedDeclaration) {
      passSourceAsString(node.source, 'esm', fn);
    },
    ExportAllDeclaration(node: TSESTree.ExportAllDeclaration | T.ExportAllDeclaration) {
      passSourceAsString(node.source, 'esm', fn);
    },
    ImportExpression(node: TSESTree.ImportExpression) {
      passSourceAsString(node.source, 'esm', fn);
    },
    CallExpression({ callee, arguments: args }: TSESTree.CallExpression | T.CallExpression) {
      // babel parser used for .js files treats import() calls as CallExpressions with callees of type "Import"
      if (T.isImport(callee)) {
        passSourceAsString(args[0], 'esm', fn);
        return;
      }

      // is this a `require()` call?
      if (isIdent(callee) && callee.name === 'require') {
        passSourceAsString(args[0], 'require', fn);
        return;
      }

      // is this an `obj.method()` call?
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        isIdent(callee.object) &&
        isIdent(callee.property)
      ) {
        const { object: left, property: right } = callee;
        const name = `${left.name}.${right.name}`;

        // is it "require.resolve()"?
        if (name === 'require.resolve') {
          passSourceAsString(args[0], 'require-resolve', fn);
        }

        // is it one of jest's mock methods?
        if (left.name === 'jest' && JEST_MODULE_METHODS.includes(name)) {
          passSourceAsString(args[0], 'jest', fn);
        }
      }
    },
  };

  return visitor as Rule.RuleListener;
}
