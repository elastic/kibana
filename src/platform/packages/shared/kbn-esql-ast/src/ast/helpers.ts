/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BinaryExpressionRenameOperator,
  BinaryExpressionWhereOperator,
  ESQLAstNode,
  ESQLBinaryExpression,
  ESQLColumn,
  ESQLFunction,
  ESQLIdentifier,
  ESQLIntegerLiteral,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLProperNode,
  ESQLSource,
} from '../types';
import { BinaryExpressionGroup } from './constants';

export const isProperNode = (node: unknown): node is ESQLProperNode =>
  !!node && typeof node === 'object' && !Array.isArray(node);

export const isFunctionExpression = (node: unknown): node is ESQLFunction =>
  isProperNode(node) && node.type === 'function';

/**
 * Returns true if the given node is a binary expression, i.e. an operator
 * surrounded by two operands:
 *
 * ```
 * 1 + 1
 * column LIKE "foo"
 * foo = "bar"
 * ```
 *
 * @param node Any ES|QL AST node.
 */
export const isBinaryExpression = (node: unknown): node is ESQLBinaryExpression =>
  isFunctionExpression(node) && node.subtype === 'binary-expression';

export const isWhereExpression = (
  node: unknown
): node is ESQLBinaryExpression<BinaryExpressionWhereOperator> =>
  isBinaryExpression(node) && node.name === 'where';

export const isAsExpression = (
  node: unknown
): node is ESQLBinaryExpression<BinaryExpressionRenameOperator> =>
  isBinaryExpression(node) && node.name === 'as';

export const isFieldExpression = (
  node: unknown
): node is ESQLBinaryExpression<BinaryExpressionWhereOperator> =>
  isBinaryExpression(node) && node.name === '=';

export const isLiteral = (node: unknown): node is ESQLLiteral =>
  isProperNode(node) && node.type === 'literal';

export const isIntegerLiteral = (node: unknown): node is ESQLIntegerLiteral =>
  isLiteral(node) && node.literalType === 'integer';

export const isDoubleLiteral = (node: unknown): node is ESQLIntegerLiteral =>
  isLiteral(node) && node.literalType === 'double';

export const isParamLiteral = (node: unknown): node is ESQLParamLiteral =>
  isLiteral(node) && node.literalType === 'param';

export const isColumn = (node: unknown): node is ESQLColumn =>
  isProperNode(node) && node.type === 'column';

export const isSource = (node: unknown): node is ESQLSource =>
  isProperNode(node) && node.type === 'source';

export const isIdentifier = (node: unknown): node is ESQLIdentifier =>
  isProperNode(node) && node.type === 'identifier';

/**
 * Returns the group of a binary expression:
 *
 * - `additive`: `+`, `-`
 * - `multiplicative`: `*`, `/`, `%`
 * - `assignment`: `=`
 * - `comparison`: `==`, `=~`, `!=`, `<`, `<=`, `>`, `>=`
 * - `regex`: `like`, `not_like`, `rlike`, `not_rlike`
 * @param node Any ES|QL AST node.
 * @returns Binary expression group or undefined if the node is not a binary expression.
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
      case 'not_like':
      case 'rlike':
      case 'not_rlike':
        return BinaryExpressionGroup.regex;
    }
  }
  return BinaryExpressionGroup.unknown;
};
