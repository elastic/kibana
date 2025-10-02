/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isFunctionExpression, isLiteral } from '../../../../ast/is';
import { within } from '../../../../ast/location';
import type { ESQLSingleAstItem } from '../../../../types';

/**
 * The position of the cursor within an expression.
 */
export type ExpressionPosition =
  | 'after_column'
  | 'after_function'
  | 'in_function'
  | 'after_not'
  | 'after_operator'
  | 'after_literal'
  | 'empty_expression';

/**
 * Escapes special characters in a string to be used as a literal match in a regular expression.
 * @param {string} text The input string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(text: string): string {
  // Characters with special meaning in regex: . * + ? ^ $ { } ( ) | [ ] \
  // We need to escape all of them. The `$&` in the replacement string means "the matched substring".
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines the position of the cursor within an expression.
 * @param innerText
 * @param expressionRoot
 * @returns
 */
export function getExpressionPosition(
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined
): ExpressionPosition {
  const endsWithNot = / not$/i.test(innerText.trimEnd());
  const isNullCheckOperator =
    expressionRoot &&
    isFunctionExpression(expressionRoot) &&
    // See https://github.com/elastic/kibana/issues/199401

    ['is null', 'is not null'].includes(expressionRoot.name);

  // Check for NOT operator (but not IS NULL/IS NOT NULL)
  if (endsWithNot && !isNullCheckOperator) {
    return 'after_not';
  }

  if (!expressionRoot) {
    return 'empty_expression';
  }

  // Check for column position (not directly after column name)
  // we are escaping the column name here as it may contain special characters such as ??
  if (isColumn(expressionRoot)) {
    const columnPattern = new RegExp(`${escapeRegExp(expressionRoot.parts.join('\\.'))}$`);

    if (!columnPattern.test(innerText)) {
      return 'after_column';
    }
  }

  // Check for function expressions
  if (isFunctionExpression(expressionRoot)) {
    if (expressionRoot.subtype === 'variadic-call') {
      return within(innerText.length, expressionRoot) ? 'in_function' : 'after_function';
    }

    return 'after_operator';
  }

  // Check for literals
  if (isLiteral(expressionRoot)) {
    return 'after_literal';
  }

  return 'empty_expression';
}

/**
 * Helper to check if position indicates cursor is after a complete expression
 */
export function isPositionAfterCompleteExpression(position: ExpressionPosition): boolean {
  return ['after_column', 'after_function', 'after_literal'].includes(position);
}
