/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Visitor } from '@oxlint/plugins';
import type { ImportType } from '@kbn/import-resolver';

import type { Importer, SomeNode } from './ast';
import { isIdentifier, isStringLiteral, isTemplateLiteral } from './ast';

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

interface VisitorContext {
  node: SomeNode;
  type: ImportType;
  importer: Importer;
}
type ImportVisitor = (req: string | null, context: VisitorContext) => void;

function passSourceAsString(
  fn: ImportVisitor,
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
 * Create a rule visitor that calls fn() for every import string, including
 * 'export from' statements, require() calls, require.resolve(), jest.mock() calls, and more.
 */
export function visitAllImportStatements(fn: ImportVisitor): Visitor {
  return {
    ImportDeclaration(node) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    ExportNamedDeclaration(node) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    ExportAllDeclaration(node) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    ImportExpression(node) {
      passSourceAsString(fn, node.source, node, 'esm');
    },
    CallExpression(node) {
      const { callee, arguments: args } = node;

      // is this a `require()` call?
      if (isIdentifier(callee) && callee.name === 'require') {
        passSourceAsString(fn, args[0], node, 'require');
        return;
      }

      // is this an `obj.method()` call?
      if (
        callee.type === 'MemberExpression' &&
        isIdentifier(callee.object) &&
        isIdentifier(callee.property)
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
}
