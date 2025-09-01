/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../../parser';
import type { ESQLSingleAstItem } from '../../types';
import {
  isBooleanExpressionFinished,
  TERMINAL_REQUIRES_SECOND,
  NULL_CHECK_OPERATORS,
} from './boolean_finishers';

const getASTForExpression = (expression: string): ESQLSingleAstItem => {
  const { root, errors } = Parser.parse(`FROM index | EVAL ${expression}`);
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse expression "${expression}": ${errors.map((e) => e.message).join(', ')}`
    );
  }
  return root.commands[1].args[0] as ESQLSingleAstItem;
};

describe('boolean finishers (utils)', () => {
  describe('terminal operators', () => {
    const opToExpression = (op: string): string => {
      switch (op) {
        case 'IN':
          return 'a IN (1, 2)';
        case 'LIKE':
        case 'RLIKE':
        case ':':
          return `a ${op} "x"`;
        default:
          return `a ${op} 1`;
      }
    };

    const completeCases = [
      ...Array.from(TERMINAL_REQUIRES_SECOND.values()).map(opToExpression),
      ...Array.from(NULL_CHECK_OPERATORS.values()).map((op) => `a ${op}`),
    ];

    test.each(completeCases)('%s is complete', (expr) => {
      const ast = getASTForExpression(expr);
      expect(isBooleanExpressionFinished(ast, expr, undefined, { traverseRightmost: true })).toBe(
        true
      );
    });
  });

  describe('logical operators', () => {
    it('AND with complete RHS is complete', () => {
      const expr = 'a < b AND c > d';
      const ast = getASTForExpression(expr);
      expect(isBooleanExpressionFinished(ast, expr, undefined, { traverseRightmost: true })).toBe(
        true
      );
    });

    it('AND with incomplete RHS is not complete', () => {
      const expr = 'a < b AND c';
      const ast = getASTForExpression(expr);
      expect(isBooleanExpressionFinished(ast, expr, undefined, { traverseRightmost: true })).toBe(
        false
      );
    });

    it('parenthesized boolean expression is complete', () => {
      const expr = '(a == 1)';
      const ast = getASTForExpression(expr);
      expect(isBooleanExpressionFinished(ast, expr, undefined, { traverseRightmost: true })).toBe(
        true
      );
    });

    it('NOT over LIKE is complete', () => {
      const expr = 'NOT (a LIKE "x")';
      const ast = getASTForExpression(expr);
      expect(isBooleanExpressionFinished(ast, expr, undefined, { traverseRightmost: true })).toBe(
        true
      );
    });
  });
});
