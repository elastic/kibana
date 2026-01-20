/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isFunctionExpression, isInlineCast, isLiteral } from '../../../../../ast/is';
import { within } from '../../../../../ast/location';
import type { ESQLSingleAstItem, ESQLFunction } from '../../../../../types';
import type { ESQLColumnData } from '../../../../registry/types';
import { isNullCheckOperator } from './utils';
import { checkFunctionInvocationComplete } from '../../functions';
import { getExpressionType } from '../../expressions';

export type ExpressionPosition =
  | 'in_function'
  | 'after_not'
  | 'after_operator'
  | 'after_complete'
  | 'after_cast'
  | 'empty_expression';

/** Matches " not" at end of string (case insensitive) */
const NOT_PATTERN = / not$/i;
/** Matches all regex special characters: . * + ? ^ $ { } ( ) | [ ] \ */
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
/** Matches "::" or "::bool" at end of string */
const INLINE_CAST_PATTERN = /::\s*([\w]*)$/;

/** Determines the position of the cursor within an expression */
export function getPosition(
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columns?: Map<string, ESQLColumnData>
): ExpressionPosition {
  // Handle NOT keyword first (must be before empty check for proper precedence)
  const endsWithNot = NOT_PATTERN.test(innerText.trimEnd());
  const isNullCheck =
    expressionRoot &&
    isFunctionExpression(expressionRoot) &&
    isNullCheckOperator(expressionRoot.name);

  if (endsWithNot && !isNullCheck) {
    return 'after_not';
  }

  if (INLINE_CAST_PATTERN.test(innerText)) {
    return 'after_cast';
  }

  if (!expressionRoot) {
    return 'empty_expression';
  }

  if (isColumn(expressionRoot)) {
    const escapedColumn = expressionRoot.parts.join('\\.').replace(REGEX_SPECIAL_CHARS, '\\$&');
    const endsWithColumnName = new RegExp(`${escapedColumn}$`).test(innerText);

    // If cursor is after column but text continues, suggest operators
    if (!endsWithColumnName) {
      return 'after_complete';
    }
  }

  if (isInlineCast(expressionRoot) && !expressionRoot.incomplete) {
    return 'after_complete';
  }

  // Function expression (operators or variadic functions like CONCAT)
  if (isFunctionExpression(expressionRoot)) {
    if (expressionRoot.subtype === 'variadic-call') {
      const cursorIsInside = within(innerText.length, expressionRoot);

      return cursorIsInside ? 'in_function' : 'after_complete';
    }

    // Postfix unary operators (IS NULL, IS NOT NULL) are complete when not marked incomplete
    // Incomplete means partial typing like "IS N" - should be handled by pre-pass
    if (expressionRoot.subtype === 'postfix-unary-expression' && !expressionRoot.incomplete) {
      return 'after_complete';
    }

    // Binary operators (e.g., "field = |", "field IN |")
    // Check if operator is complete (has both operands)
    if (expressionRoot.subtype === 'binary-expression' && columns) {
      const { complete } = checkFunctionInvocationComplete(expressionRoot as ESQLFunction, (expr) =>
        getExpressionType(expr, columns)
      );

      return complete ? 'after_complete' : 'after_operator';
    }

    // Fallback: if no columns available, use old behavior
    return 'after_operator';
  }

  // Literals and map expressions are complete expressions
  if (isLiteral(expressionRoot) || expressionRoot.type === 'map') {
    return 'after_complete';
  }

  return 'empty_expression';
}
