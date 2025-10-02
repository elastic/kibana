/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn } from '../../../../../ast/is';
import { isList } from '../../../../../ast/is';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import {
  listCompleteItem,
  commaCompleteItem,
} from '../../../../../commands_registry/complete_items';
import type { ESQLColumn, ESQLFunction } from '../../../../../types';
import { logicalOperators } from '../../../../all_operators';
import {
  getBinaryExpressionOperand,
  getExpressionType,
  getRightmostNonVariadicOperator,
} from '../../../expressions';
import { getFieldsOrFunctionsSuggestions, getLastNonWhitespaceChar } from '../../helpers';
import {
  getOperatorSuggestion,
  getSuggestionsToRightOfOperatorExpression,
} from '../../../operators';
import type { ExpressionContext } from '../context';

/**
 * Handles suggestions after binary/unary operators
 *
 * This handler covers:
 * - After comparison operators: field > /
 * - After logical operators: condition AND /
 * - Special IN/NOT IN operator handling with list suggestions
 * - Rightmost operator detection for nested expressions
 */
export async function handleAfterOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, innerText, location, options, context, env } = ctx;
  const { preferredExpressionType } = options;
  const suggestions: ISuggestionItem[] = [];

  if (!expressionRoot) {
    return suggestions;
  }

  const fn = expressionRoot as ESQLFunction;

  // Special case: IN/NOT IN operators with list value suggestions
  // Examples: field IN /, field IN (value1, /), field NOT IN (/)
  if (isInOperator(fn.name)) {
    const list = getBinaryExpressionOperand(fn, 'right');

    if (isList(list)) {
      // List has no parentheses yet - suggest list opening
      const hasNoParentheses = list.location.min === 0 && list.location.max === 0;

      if (hasNoParentheses) {
        return [listCompleteItem];
      }

      const cursorPos = innerText.length;

      // Cursor inside list - suggest values matching first argument type
      if (cursorPos <= list.location.max) {
        const firstArg = getBinaryExpressionOperand(fn, 'left');

        if (isColumn(firstArg)) {
          const hasValues = isList(list) && list.values && list.values.length > 0;
          const isAfterComma = getLastNonWhitespaceChar(innerText) === ',';

          // After a value but not after comma: suggest comma with space
          if (hasValues && !isAfterComma) {
            return [{ ...commaCompleteItem, text: ', ' }];
          }

          // After comma or empty list: suggest field/function values
          const otherArgs = isList(list)
            ? list.values
            : fn.args.filter(Array.isArray).flat().filter(isColumn);

          const ignoredColumns = [
            firstArg.parts.join('.'),
            ...otherArgs.filter(isColumn).map((col: ESQLColumn) => col.parts.join('.')),
          ].filter(Boolean);

          return await getSuggestionsForInOperatorColumn(
            firstArg,
            location,
            context,
            env,
            ignoredColumns
          );
        }

        return [];
      }
      // Cursor after list: fall through to rightmost operator logic
    } else {
      // No list yet - suggest opening list or first value
      const firstArg = getBinaryExpressionOperand(fn, 'left');

      if (isColumn(firstArg)) {
        return await getSuggestionsForInOperatorColumn(firstArg, location, context, env, [
          firstArg.parts.join('.'),
        ]);
      }

      return [];
    }
  }

  const rightmostOperator = getRightmostNonVariadicOperator(fn) as ESQLFunction;

  // After IS NULL / IS NOT NULL - suggest logical operators (AND, OR)
  if (rightmostOperator.text.toLowerCase().trim().endsWith('null')) {
    suggestions.push(...logicalOperators.map(getOperatorSuggestion));

    return suggestions;
  }

  // After complete IN/NOT IN expression - suggest logical operators (AND, OR)
  if (isInOperator(rightmostOperator.name) && rightmostOperator.subtype === 'binary-expression') {
    const cursorPos = innerText.length;
    const operatorEnd = rightmostOperator.location.max;

    if (cursorPos > operatorEnd) {
      suggestions.push(...logicalOperators.map(getOperatorSuggestion));

      return suggestions;
    }
  }

  // Default case: suggest appropriate values/operators to the right of the operator
  suggestions.push(
    ...(await getSuggestionsToRightOfOperatorExpression({
      queryText: innerText,
      location,
      rootOperator: rightmostOperator,
      preferredExpressionType,
      getExpressionType: (expression) => getExpressionType(expression, context?.columns),
      getColumnsByType: env.getColumnsByType,
      hasMinimumLicenseRequired: env.hasMinimumLicenseRequired,
      activeProduct: env.activeProduct,
    }))
  );

  return suggestions;
}

function isInOperator(name: string): boolean {
  return name === 'in' || name === 'not in';
}

async function getSuggestionsForInOperatorColumn(
  firstArg: ESQLColumn,
  location: ExpressionContext['location'],
  context: ExpressionContext['context'],
  env: ExpressionContext['env'],
  ignoredColumns: string[]
): Promise<ISuggestionItem[]> {
  const argType = getExpressionType(firstArg, context?.columns);

  if (!argType) {
    return [];
  }

  return await getFieldsOrFunctionsSuggestions(
    [argType],
    location,
    env.getColumnsByType,
    { functions: true, columns: true },
    { ignoreColumns: ignoredColumns },
    env.hasMinimumLicenseRequired,
    env.activeProduct
  );
}
