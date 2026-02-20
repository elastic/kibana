/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PromQLAstExpression, PromQLBinaryOperator } from '../types';

/**
 * Precedence groups for PromQL binary operators. Higher numeric value means
 * tighter binding.
 */
export enum PromQLPrecedenceGroup {
  none = 0,
  or = 1,
  andUnless = 2,
  comparison = 3,
  additive = 4,
  multiplicative = 5,
  power = 6,
}

/**
 * Returns the precedence group for a PromQL AST expression node. Non-binary
 * expressions return `PromQLPrecedenceGroup.none`.
 */
export const promqlBinaryPrecedenceGroup = (node: PromQLAstExpression): PromQLPrecedenceGroup => {
  if (node.type !== 'binary-expression') {
    return PromQLPrecedenceGroup.none;
  }

  switch (node.name) {
    case '^':
      return PromQLPrecedenceGroup.power;
    case '*':
    case '/':
    case '%':
      return PromQLPrecedenceGroup.multiplicative;
    case '+':
    case '-':
      return PromQLPrecedenceGroup.additive;
    case '==':
    case '!=':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return PromQLPrecedenceGroup.comparison;
    case 'and':
    case 'unless':
      return PromQLPrecedenceGroup.andUnless;
    case 'or':
      return PromQLPrecedenceGroup.or;
    default:
      return PromQLPrecedenceGroup.none;
  }
};

/**
 * Returns whether a PromQL binary operator is right-associative.
 *
 * In PromQL, `^` (power/exponentiation) is the **only** right-associative
 * binary operator. All others (`+`, `-`, `*`, `/`, `%`, comparisons, `and`,
 * `or`, `unless`) are left-associative.
 *
 * This matters for parens insertion of same-precedence children:
 *
 * - Right-associative: the **left** child needs parens to override natural
 *   grouping (`(a ^ b) ^ c` — without parens it would be `a ^ (b ^ c)`).
 * - Left-associative: the **right** child needs parens (`a - (b + c)`).
 */
export const isPromQLRightAssociative = (op: PromQLBinaryOperator): boolean => op === '^';
