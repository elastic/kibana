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
import { isNullCheckOperator } from './utils';

export type ExpressionPosition =
  | 'after_column'
  | 'after_function'
  | 'in_function'
  | 'after_not'
  | 'after_operator'
  | 'after_literal'
  | 'empty_expression';

/** Matches " not" at end of string (case insensitive) */
const NOT_PATTERN = / not$/i;
/** Matches all regex special characters: . * + ? ^ $ { } ( ) | [ ] \ */
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

/** Determines the position of the cursor within an expression */
export function getPosition(
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined
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

  // No expression parsed yet (e.g., "FROM a | EVAL |")
  if (!expressionRoot) {
    return 'empty_expression';
  }

  // Column reference (e.g., "field|" or "field |")
  if (isColumn(expressionRoot)) {
    const escapedColumn = expressionRoot.parts.join('\\.').replace(REGEX_SPECIAL_CHARS, '\\$&');
    const endsWithColumnName = new RegExp(`${escapedColumn}$`).test(innerText);

    // If cursor is after column but text continues, suggest operators
    if (!endsWithColumnName) {
      return 'after_column';
    }
  }

  // Function expression (operators or variadic functions like CONCAT)
  if (isFunctionExpression(expressionRoot)) {
    if (expressionRoot.subtype === 'variadic-call') {
      const cursorIsInside = within(innerText.length, expressionRoot);

      return cursorIsInside ? 'in_function' : 'after_function';
    }

    // Binary operators (e.g., "field = |", "field IN |")
    return 'after_operator';
  }

  // Literal value (e.g., "123|" or "\"text\"|")
  if (isLiteral(expressionRoot)) {
    return 'after_literal';
  }

  return 'empty_expression';
}
