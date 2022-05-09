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

export type Importer =
  | TSESTree.ImportDeclaration
  | T.ImportDeclaration
  | TSESTree.ExportNamedDeclaration
  | T.ExportNamedDeclaration
  | TSESTree.ExportAllDeclaration
  | T.ExportAllDeclaration
  | TSESTree.CallExpression
  | T.CallExpression
  | TSESTree.ImportExpression
  | TSESTree.CallExpression
  | T.CallExpression;

export type SomeNode = TSESTree.Node | T.Node;

interface VisitorContext {
  node: SomeNode;
  type: ImportType;
  importer: Importer;
}
type Visitor = (req: string | null, context: VisitorContext) => void;

const isIdent = (node: SomeNode): node is TSESTree.Identifier | T.Identifier =>
  T.isIdentifier(node) || node.type === AST_NODE_TYPES.Identifier;

const isStringLiteral = (node: SomeNode): node is TSESTree.StringLiteral | T.StringLiteral =>
  T.isStringLiteral(node) ||
  (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string');

const isTemplateLiteral = (node: SomeNode): node is TSESTree.TemplateLiteral | T.TemplateLiteral =>
  T.isTemplateLiteral(node) || node.type === AST_NODE_TYPES.TemplateLiteral;

function passSourceAsString(
  fn: Visitor,
  node: SomeNode | null | undefined,
  importer: Importer,
  type: ImportType
) {
  if (!node) {
    return;
  }

  const ctx = {
    node,
    importer,
    type,
  };

  if (isStringLiteral(node)) {
    return fn(node.value, ctx);
  }

  if (isTemplateLiteral(node)) {
    if (node.expressions.length) {
      return null;
    }

    return fn(
      [...node.quasis].reduce((acc, q) => acc + q.value.raw, ''),
      ctx
    );
  }

  return fn(null, ctx);
}

/**
 * Create an ESLint rule visitor that calls fn() for every import string, including
 * 'export from' statements, require() calls, require.resolve(), jest.mock() calls, and more.
 * Works with both babel eslint and typescript-eslint parsers
 */
export function visitAllImportStatements(fn: Visitor) {
  const visitor = {
    ImportDeclaration(node: TSESTree.ImportDeclaration | T.ImportDeclaration) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration | T.ExportNamedDeclaration) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    ExportAllDeclaration(node: TSESTree.ExportAllDeclaration | T.ExportAllDeclaration) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    ImportExpression(node: TSESTree.ImportExpression) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    CallExpression(node: TSESTree.CallExpression | T.CallExpression) {
      const { callee, arguments: args } = node;
      // babel parser used for .js files treats import() calls as CallExpressions with callees of type "Import"
      if (T.isImport(callee)) {
        passSourceAsString(fn, args[0], node, 'esm');
        return;
      }

      // is this a `require()` call?
      if (isIdent(callee) && callee.name === 'require') {
        passSourceAsString(fn, args[0], node, 'require');
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
          passSourceAsString(fn, args[0], node, 'require-resolve');
        }

        // is it one of jest's mock methods?
        if (left.name === 'jest' && JEST_MODULE_METHODS.includes(name)) {
          passSourceAsString(fn, args[0], node, 'jest');
        }
      }
    },
  };

  return visitor as Rule.RuleListener;
}
