/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isList, isSubQuery } from '@elastic/esql';
import type { ESQLColumn, ESQLFunction, ESQLSingleAstItem } from '@elastic/esql/types';
import type { ISuggestionItem } from '../../../../../registry/types';
import {
  listCompleteItem,
  commaCompleteItem,
  buildSubqueryCompleteItems,
  likePatternItems,
  rlikePatternItems,
} from '../../../../../registry/complete_items';
import { getBinaryExpressionOperand, getExpressionType } from '../../../expressions';
import { buildExpressionFunctionParameterContext } from '../utils';
import type { ExpressionContext } from '../types';
import {
  getLogicalContinuationSuggestions,
  isOperandMissing,
  shouldSuggestRightOperandStart,
} from './utils';
import { shouldSuggestComma } from '../comma_decision_engine';
import { SuggestionBuilder } from '../suggestion_builder';
import { withAutoSuggest } from '../../helpers';

// ============================================================================
// eg. IN / NOT IN Operators
// ============================================================================

/** Handles IN and NOT IN operators with list syntax or subquery syntax. */
export async function handleListOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, innerText } = ctx;

  const fn = expressionRoot as ESQLFunction;

  // For IN/NOT IN, args are never arrays because the parser builds a single ESQLList node
  // containing the values, not a JS array of values.
  const rightOperand = getBinaryExpressionOperand(fn, 'right') as ESQLSingleAstItem | undefined;
  const leftOperand = getBinaryExpressionOperand(fn, 'left') as ESQLSingleAstItem | undefined;
  const allowSubqueryOperand = ctx.options.allowSubquery === true;

  // No list yet: suggest opening parenthesis
  if (shouldSuggestRightOperandStart(rightOperand)) {
    if (allowSubqueryOperand) {
      return [
        listCompleteItem,
        ...buildSubqueryCompleteItems({ previewCommands: ['from', 'row', 'ts'] }),
      ];
    }

    return [listCompleteItem];
  }

  // A subquery operand is already present; only suggest continuations after it.
  if (isSubQuery(rightOperand)) {
    const cursorAfterSubquery = innerText.length > rightOperand.location.max;

    if (cursorAfterSubquery) {
      return getLogicalContinuationSuggestions();
    }

    return [];
  }

  // List exists
  if (isList(rightOperand)) {
    // Cursor after closed list: suggest logical operators
    if (innerText.length > rightOperand.location.max) {
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

    // After a value but not after comma: suggest comma
    if (
      shouldSuggestComma({
        position: 'inside_list',
        innerText,
        listHasValues: rightOperand.values && rightOperand.values.length > 0,
      })
    ) {
      return [withAutoSuggest({ ...commaCompleteItem, text: ',' })];
    }

    // After comma or empty list: suggest values
    const isEmptyList = !rightOperand.values || rightOperand.values.length === 0;
    const ignoredColumns = isEmptyList
      ? []
      : [
          ...(columnForType ? [columnForType.parts.join('.')] : []),
          ...(rightOperand.values || [])
            .filter(isColumn)
            .map((col: ESQLColumn) => col.parts.join('.')),
        ].filter(Boolean);

    return getListValueSuggestions(ctx, columnForType, ignoredColumns);
  }

  return [];
}

async function getListValueSuggestions(
  ctx: ExpressionContext,
  column: ESQLColumn | undefined,
  ignoredColumns: string[]
): Promise<ISuggestionItem[]> {
  const argType = column
    ? getExpressionType(column, ctx.context?.columns, ctx.context?.unmappedFieldsStrategy)
    : undefined;
  const builder = new SuggestionBuilder(ctx);

  await builder.addFields({
    types: argType ? [argType] : undefined,
    ignoredColumns,
    addSpaceAfterField: true,
    openSuggestions: true,
  });

  builder
    .addFunctions({
      types: argType ? [argType] : undefined,
    })
    .addLiterals({
      types: argType ? [argType] : undefined,
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
  const rightOperand = getBinaryExpressionOperand(fn, 'right') as ESQLSingleAstItem | undefined;

  if (isOperandMissing(rightOperand)) {
    return getStringPatternSuggestions(operator);
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
    })
  ) {
    return [{ ...commaCompleteItem, text: ', ' }];
  }

  // Otherwise suggest some basic patterns based on operator
  return getStringPatternSuggestions(operator);
}

/** Returns pattern suggestions for LIKE/RLIKE operators */
function getStringPatternSuggestions(operator: string): ISuggestionItem[] {
  return operator.includes('rlike') ? rlikePatternItems : likePatternItems;
}

// ============================================================================
// eg. : (match operator)
// ============================================================================

/** Handles the match operator (:) whose right operand accepts only constant values */
export async function handleMatchOperator(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const fn = ctx.expressionRoot as ESQLFunction | undefined;

  if (!fn) {
    return null;
  }

  const rightOperand = getBinaryExpressionOperand(fn, 'right') as ESQLSingleAstItem | undefined;

  if (!isOperandMissing(rightOperand)) {
    return null;
  }

  const parameterContext = buildExpressionFunctionParameterContext(fn, ctx.context, true);

  if (!parameterContext) {
    return null;
  }

  const suggestions = new SuggestionBuilder(ctx)
    .addConstants({
      paramDefinitions: parameterContext.paramDefinitions,
      shouldAddComma: false,
      hasMoreMandatoryArgs: parameterContext.hasMoreMandatoryArgs,
      preferredPlaceholderType: parameterContext.firstArgumentType,
      includeValuesControl: true,
      // The match operator grammar accepts only literal constants as the right operand,
      // not constant-generating functions (e.g. `field : E()` is a parse error).
      includeConstantFunctions: false,
    })
    .build();

  return suggestions.length > 0 ? suggestions : null;
}
