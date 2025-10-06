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
import {
  getFieldsSuggestions,
  getFunctionsSuggestions,
  getLiteralsSuggestions,
} from '../../helpers';
import type { ExpressionContext } from '../types';
import {
  getLogicalContinuationSuggestions,
  shouldSuggestCommaInList,
  shouldSuggestOpenListForOperand,
} from './utils';
import { getColumnsByTypeFromCtx, getLicenseCheckerFromCtx } from '../utils';
import type { GetColumnsByTypeFn } from '../../../../../commands_registry/types';
import { buildConstantsDefinitions } from '../../../literals';

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

    // Cursor inside list
    if (isColumn(leftOperand)) {
      // After a value but not after comma: suggest comma
      if (shouldSuggestCommaInList(innerText, list)) {
        return [{ ...commaCompleteItem, text: ', ' }];
      }

      // After comma or empty list: suggest values
      const ignoredColumns = [
        leftOperand.parts.join('.'),
        ...(list.values || []).filter(isColumn).map((col: ESQLColumn) => col.parts.join('.')),
      ].filter(Boolean);

      return getSuggestionsForColumn(leftOperand, ctx, ignoredColumns);
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

  const suggestions: ISuggestionItem[] = [];

  // Add field suggestions
  const getByType: GetColumnsByTypeFn = (types, ignored, options) =>
    getColumnsByTypeFromCtx(ctx, types, ignored, options);
  {
    const fieldSuggestions = await getFieldsSuggestions([argType], getByType, {
      ignoreColumns: ignoredColumns,
    });
    suggestions.push(...fieldSuggestions);
  }

  // Add function suggestions
  const functionSuggestions = getFunctionsSuggestions({
    location: ctx.location,
    types: [argType],
    options: {},
    context: ctx.context,
    callbacks: { hasMinimumLicenseRequired: getLicenseCheckerFromCtx(ctx) },
  });
  suggestions.push(...functionSuggestions);

  // Add literal suggestions
  const literalSuggestions = getLiteralsSuggestions([argType], ctx.location, {
    includeDateLiterals: true,
    includeCompatibleLiterals: true,
    addComma: false,
    advanceCursorAndOpenSuggestions: false,
  });
  suggestions.push(...literalSuggestions);

  return suggestions;
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
  if (!fn) return null;

  const operator = fn.name.toLowerCase();
  const rightOperand = getBinaryExpressionOperand(fn, 'right');

  // No list yet or an empty list: suggest opening parenthesis and basic patterns
  if (shouldSuggestOpenListForOperand(rightOperand)) {
    return [listCompleteItem, ...getStringPatternSuggestions(operator)];
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
  if (shouldSuggestCommaInList(context.innerText, list)) {
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
