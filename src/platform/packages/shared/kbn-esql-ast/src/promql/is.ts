/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PromQLAggregateExpr,
  PromQLAstBaseItem,
  PromQLAstNode,
  PromQLBinaryExpr,
  PromQLCall,
  PromQLExpression,
  PromQLLiteral,
  PromQLMatrixSelector,
  PromQLParens,
  PromQLSelector,
  PromQLSubqueryExpr,
  PromQLUnaryExpr,
  PromQLVectorSelector,
} from './types';

export const isPromQLNode = (node: unknown): node is PromQLAstNode =>
  typeof node === 'object' &&
  node !== null &&
  'dialect' in node &&
  (node as PromQLAstBaseItem).dialect === 'promql';

export const isPromQLExpression = (node: unknown): node is PromQLExpression => isPromQLNode(node);

export const isPromQLLiteral = (node: unknown): node is PromQLLiteral =>
  isPromQLNode(node) &&
  'type' in node &&
  (node as PromQLLiteral).type === 'literal' &&
  'literalType' in node &&
  ((node as PromQLLiteral).literalType === 'promql-number' ||
    (node as PromQLLiteral).literalType === 'promql-string' ||
    (node as PromQLLiteral).literalType === 'promql-duration');

export const isPromQLSelector = (node: unknown): node is PromQLSelector =>
  isPromQLNode(node) &&
  'type' in node &&
  (node as PromQLSelector).type === 'promql-selector' &&
  'selectorType' in node &&
  ((node as PromQLSelector).selectorType === 'vector' ||
    (node as PromQLSelector).selectorType === 'matrix');

export const isPromQLVectorSelector = (node: unknown): node is PromQLVectorSelector =>
  isPromQLSelector(node) && (node as PromQLSelector).selectorType === 'vector';

export const isPromQLMatrixSelector = (node: unknown): node is PromQLMatrixSelector =>
  isPromQLSelector(node) && (node as PromQLSelector).selectorType === 'matrix';

export const isPromQLBinaryExpr = (node: unknown): node is PromQLBinaryExpr =>
  isPromQLNode(node) &&
  'type' in node &&
  (node as PromQLBinaryExpr).type === 'function' &&
  'subtype' in node &&
  (node as PromQLBinaryExpr).subtype === 'binary-expression';

export const isPromQLUnaryExpr = (node: unknown): node is PromQLUnaryExpr =>
  isPromQLNode(node) &&
  'type' in node &&
  (node as PromQLUnaryExpr).type === 'function' &&
  'subtype' in node &&
  (node as PromQLUnaryExpr).subtype === 'unary-expression';

export const isPromQLCall = (node: unknown): node is PromQLCall =>
  isPromQLNode(node) &&
  'type' in node &&
  (node as PromQLCall).type === 'function' &&
  'subtype' in node &&
  (node as PromQLCall).subtype === 'variadic-call';

export const isPromQLAggregateExpr = (node: unknown): node is PromQLAggregateExpr =>
  isPromQLNode(node) && 'type' in node && (node as PromQLAggregateExpr).type === 'promql-aggregate';

export const isPromQLSubqueryExpr = (node: unknown): node is PromQLSubqueryExpr =>
  isPromQLNode(node) && 'type' in node && (node as PromQLSubqueryExpr).type === 'promql-subquery';

export const isPromQLParens = (node: unknown): node is PromQLParens =>
  isPromQLNode(node) && 'type' in node && (node as PromQLParens).type === 'parens';
