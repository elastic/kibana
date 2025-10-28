/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isList } from '../../../../../ast/is';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import {
  listCompleteItem,
  commaCompleteItem,
} from '../../../../../commands_registry/complete_items';
import type { ESQLColumn, ESQLFunction } from '../../../../../types';
import { getBinaryExpressionOperand, getExpressionType } from '../../../expressions';
import type { ExpressionContext } from '../types';
import { getLogicalContinuationSuggestions, shouldSuggestOpenListForOperand } from './utils';
import { shouldSuggestComma } from '../comma_decision_engine';
import { buildConstantsDefinitions } from '../../../literals';
import { SuggestionBuilder } from '../suggestion_builder';

// ============================================================================
// eg. IN / NOT IN Operators
// ============================================================================

/** Handles IN and NOT IN operators with list syntax (e.g., field IN (1, 2, 3)) */
export async function handleListOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, innerText } = ctx;

  const fn = expressionRoot as ESQLFunction;
  const list = getBinaryExpressionOperand(fn, 'right');
  const leftOperand = getBinaryExpressionOperand(fn, 'left');

  // No list yet: suggest opening parenthesis
  if (shouldSuggestOpenListForOperand(list)) {
    return [listCompleteItem];
  }

  // List exists
  if (isList(list)) {
    // Cursor after closed list: suggest logical operators
    if (innerText.length > list.location.max) {
      return getLogicalContinuationSuggestions();
    }

    // Cursor inside list - try to find the column to determine type
    let columnForType: ESQLColumn | undefined;

    if (isColumn(leftOperand)) {
      columnForType = leftOperand;
    } else {
      // Try to extract the actual field from fn.args[0]
      const firstArg = fn.args[0];

      if (isColumn(firstArg)) {
        columnForType = firstArg;
      }
    }

    if (columnForType) {
      // After a value but not after comma: suggest comma
      if (
        shouldSuggestComma({
          position: 'inside_list',
          innerText,
          listHasValues: list.values && list.values.length > 0,
        })
      ) {
        return [{ ...commaCompleteItem, text: ', ' }];
      }

      // After comma or empty list: suggest values
      // For empty lists, don't ignore the left column - we want to suggest fields of the same type
      const isEmptyList = !list.values || list.values.length === 0;
      const ignoredColumns = isEmptyList
        ? []
        : [
            columnForType.parts.join('.'),
            ...(list.values || []).filter(isColumn).map((col: ESQLColumn) => col.parts.join('.')),
          ].filter(Boolean);

      return getSuggestionsForColumn(columnForType, ctx, ignoredColumns);
    }
  }

  return [];
}

async function getSuggestionsForColumn(
  column: ESQLColumn,
  ctx: ExpressionContext,
  ignoredColumns: string[]
): Promise<ISuggestionItem[]> {
  const argType = getExpressionType(column, ctx.context?.columns);

  if (!argType) {
    return [];
  }

  // Use SuggestionBuilder to eliminate duplicated suggestion patterns
  const builder = new SuggestionBuilder(ctx);

  await builder.addFields({
    types: [argType],
    ignoredColumns,
  });

  builder
    .addFunctions({
      types: [argType],
    })
    .addLiterals({
      types: [argType],
      includeDateLiterals: true,
      includeCompatibleLiterals: true,
    });

  return builder.build();
}

// ============================================================================
// eg. IS NULL / IS NOT NULL Operators
// ============================================================================

/** Handles NULL-check operators (IS NULL, IS NOT NULL) */
export async function handleNullCheckOperator(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const fn = ctx.expressionRoot as ESQLFunction | undefined;
  if (fn?.incomplete === true) {
    return null;
  }

  return getLogicalContinuationSuggestions();
}

// ============================================================================
// eg. LIKE / RLIKE / NOT LIKE / NOT RLIKE Operators
// ============================================================================

/** Handles string pattern operators with list syntax (e.g., field LIKE ("*pattern*", "*other*")) */
export async function handleStringListOperator(
  context: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const fn = context.expressionRoot as ESQLFunction | undefined;

  if (!fn) {
    return null;
  }

  const operator = fn.name.toLowerCase();
  const rightOperand = getBinaryExpressionOperand(fn, 'right');
  const leftOperand = getBinaryExpressionOperand(fn, 'left');

  // No list yet: suggest any string expressions (LIKE pattern can be any string expression)
  if (shouldSuggestOpenListForOperand(rightOperand)) {
    // LIKE/RLIKE accepts any string pattern, so suggest all string-compatible expressions
    const builder = new SuggestionBuilder(context);

    const ignoredColumns = isColumn(leftOperand)
      ? [leftOperand.parts.join('.')].filter(Boolean)
      : [];

    await builder.addFields({
      types: ['any'],
      ignoredColumns,
    });

    builder
      .addFunctions({
        types: ['any'],
      })
      .addLiterals({
        types: ['any'],
        includeDateLiterals: false,
        includeCompatibleLiterals: true,
      });

    return builder.build();
  }

  // Only handle list form; otherwise, delegate by returning null
  if (!isList(rightOperand)) {
    return null;
  }

  const list = rightOperand;
  const cursorPos = context.innerText.length;

  // Cursor after closed list: suggest logical operators
  if (cursorPos > list.location.max) {
    return getLogicalContinuationSuggestions();
  }

  // Cursor inside list: if previous value without a comma, suggest comma
  if (
    shouldSuggestComma({
      position: 'inside_list',
      innerText: context.innerText,
      listHasValues: list.values && list.values.length > 0,
    })
  ) {
    return [{ ...commaCompleteItem, text: ', ' }];
  }

  // Otherwise suggest some basic patterns based on operator
  return getStringPatternSuggestions(operator);
}

/** Returns basic pattern suggestions for LIKE/RLIKE operators */
function getStringPatternSuggestions(operator: string): ISuggestionItem[] {
  const isRlike = operator.includes('rlike');

  // RLIKE: empty string, match anything, match from start to end
  // LIKE: empty string, wildcard for any characters
  const patterns = isRlike ? ['""', '".*"', '"^.*$"'] : ['""', '"*"'];

  return buildConstantsDefinitions(patterns, undefined, 'A');
}
