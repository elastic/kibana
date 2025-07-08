/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as types from '../types';
import { ESQLInlineCast, ESQLTimeInterval } from '../types';

export const isProperNode = (node: unknown): node is types.ESQLProperNode =>
  !!node &&
  typeof node === 'object' &&
  !Array.isArray(node) &&
  typeof (node as types.ESQLProperNode).type === 'string' &&
  !!(node as types.ESQLProperNode).type;

export const isFunctionExpression = (node: unknown): node is types.ESQLFunction =>
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
export const isBinaryExpression = (node: unknown): node is types.ESQLBinaryExpression =>
  isFunctionExpression(node) && node.subtype === 'binary-expression';

export const isWhereExpression = (
  node: unknown
): node is types.ESQLBinaryExpression<types.BinaryExpressionWhereOperator> =>
  isBinaryExpression(node) && node.name === 'where';

export const isAsExpression = (
  node: unknown
): node is types.ESQLBinaryExpression<types.BinaryExpressionRenameOperator> =>
  isBinaryExpression(node) && node.name === 'as';

export const isFieldExpression = (
  node: unknown
): node is types.ESQLBinaryExpression<types.BinaryExpressionWhereOperator> =>
  isBinaryExpression(node) && node.name === '=';

export const isLiteral = (node: unknown): node is types.ESQLLiteral =>
  isProperNode(node) && node.type === 'literal';

export const isStringLiteral = (node: unknown): node is types.ESQLStringLiteral =>
  isLiteral(node) && node.literalType === 'keyword';

export const isIntegerLiteral = (node: unknown): node is types.ESQLIntegerLiteral =>
  isLiteral(node) && node.literalType === 'integer';

export const isDoubleLiteral = (node: unknown): node is types.ESQLIntegerLiteral =>
  isLiteral(node) && node.literalType === 'double';

export const isBooleanLiteral = (node: unknown): node is types.ESQLStringLiteral =>
  isLiteral(node) && node.literalType === 'boolean';

export const isParamLiteral = (node: unknown): node is types.ESQLParamLiteral =>
  isLiteral(node) && node.literalType === 'param';

export const isColumn = (node: unknown): node is types.ESQLColumn =>
  isProperNode(node) && node.type === 'column';

export const isSource = (node: unknown): node is types.ESQLSource =>
  isProperNode(node) && node.type === 'source';

export const isIdentifier = (node: unknown): node is types.ESQLIdentifier =>
  isProperNode(node) && node.type === 'identifier';

export const isList = (node: unknown): node is types.ESQLList =>
  isProperNode(node) && node.type === 'list';

export const isOptionNode = (node: types.ESQLAstNode): node is types.ESQLCommandOption => {
  return !!node && typeof node === 'object' && !Array.isArray(node) && node.type === 'option';
};

export const isTimeInterval = (node: unknown): node is ESQLTimeInterval =>
  isProperNode(node) && node.type === 'timeInterval';

export const isInlineCast = (node: unknown): node is ESQLInlineCast =>
  isProperNode(node) && node.type === 'inlineCast';
