/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBinaryExpression } from './is';
import type { ESQLAstNode } from '../types';

/**
 * The group name of a binary expression. Groups are ordered by precedence.
 */
export enum BinaryExpressionGroup {
  /**
   * No group, not a binary expression.
   */
  none = 0,

  /**
   * Binary expression, but its group is unknown.
   */
  unknown = 1,

  /**
   * Logical: `and`, `or`
   */
  or = 10,
  and = 11,

  /**
   * Regular expression: `like`, `not like`, `rlike`, `not rlike`
   */
  regex = 20,

  /**
   * Assignment: `=`, `:=`
   */
  assignment = 30,

  /**
   * Comparison: `==`, `=~`, `!=`, `<`, `<=`, `>`, `>=`
   */
  comparison = 40,

  /**
   * Additive: `+`, `-`
   */
  additive = 50,

  /**
   * Multiplicative: `*`, `/`, `%`
   */
  multiplicative = 60,
}

/**
 * Returns the group of a binary expression.
 *
 * @param node Any ES|QL AST node.
 * @returns Binary expression group or undefined if the node is
 *     not a binary expression.
 */
export const binaryExpressionGroup = (node: ESQLAstNode): BinaryExpressionGroup => {
  if (isBinaryExpression(node)) {
    switch (node.name) {
      case '+':
      case '-':
        return BinaryExpressionGroup.additive;
      case '*':
      case '/':
      case '%':
        return BinaryExpressionGroup.multiplicative;
      case '=':
        return BinaryExpressionGroup.assignment;
      case '==':
      case '=~':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
        return BinaryExpressionGroup.comparison;
      case 'like':
      case 'not like':
      case 'rlike':
      case 'not rlike':
        return BinaryExpressionGroup.regex;
      case 'or':
        return BinaryExpressionGroup.or;
      case 'and':
        return BinaryExpressionGroup.and;
    }
    return BinaryExpressionGroup.unknown;
  }
  return BinaryExpressionGroup.none;
};
