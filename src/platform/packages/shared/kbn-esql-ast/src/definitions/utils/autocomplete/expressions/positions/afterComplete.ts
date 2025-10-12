/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../commands_registry/types';
import { isParameterType } from '../../../../types';
import { getTimeUnitLiterals } from '../../../literals';
import type { ExpressionContext } from '../types';
import { isLiteral, isFunctionExpression } from '../../../../../ast/is';
import { isNumericType, FunctionDefinitionTypes } from '../../../../types';
import { commaCompleteItem } from '../../../../../commands_registry/complete_items';
import { shouldSuggestComma, type CommaContext } from '../commaDecisionEngine';
import { getExpressionType } from '../../../expressions';
import { SignatureAnalyzer } from '../SignatureAnalyzer';
import { getLogicalContinuationSuggestions } from '../operators/utils';
import {
  analyzeParameterState,
  handleUnknownType,
  getStandardOperatorSuggestions,
} from './afterComplete/shared';
import { shouldSuggestOperators } from './afterComplete/shouldSuggestOperators';

/**
 * Handler for autocomplete suggestions after complete expressions.
 * Handles after_complete position for all complete expression types:
 * - Columns (e.g., "field /")
 * - Functions (e.g., "ABS(x) /")
 * - Literals (e.g., "123 /" or "true /")
 * - Postfix operators (e.g., "field IS NULL /")
 *
 * Boolean literals (true/false) have special operator filtering logic.
 */
export async function suggestAfterComplete(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, context, options } = ctx;
  const { functionParameterContext } = options;

  // Postfix unary operators (IS NULL, IS NOT NULL) are complete boolean expressions
  // They should only suggest logical operators (AND, OR) and comma in function contexts
  if (
    expressionRoot &&
    isFunctionExpression(expressionRoot) &&
    expressionRoot.subtype === 'postfix-unary-expression'
  ) {
    const suggestions = getLogicalContinuationSuggestions();

    // Check if cursor is already followed by comma to avoid duplicates
    if (options.isCursorFollowedByComma) {
      return suggestions;
    }

    // Only suggest comma if we're inside a function (indicated by functionParameterContext)
    // Top-level expressions (e.g., WHERE field IS NULL) should not suggest comma
    if (!functionParameterContext) {
      return suggestions;
    }

    // We're inside a function - try shouldSuggestComma for precise decision
    let includeComma = shouldSuggestComma({
      position: 'after_complete',
      hasMoreMandatoryArgs: functionParameterContext.hasMoreMandatoryArgs,
      functionSignatures: functionParameterContext.validSignatures,
      isCursorFollowedByComma: false, // Already checked above
    });

    // Fallback: If shouldSuggestComma said no due to missing context info,
    // optimistically suggest comma (better to over-suggest inside functions)
    if (!includeComma) {
      includeComma = true;
    }

    if (includeComma) {
      return [...suggestions, commaCompleteItem];
    }

    return suggestions;
  }

  // Enrich context with expression type and signature analysis
  const expressionType = getExpressionType(expressionRoot, context?.columns);
  const signatureAnalysis = functionParameterContext
    ? SignatureAnalyzer.from(functionParameterContext)
    : null;

  const enrichedCtx = {
    ...ctx,
    expressionType,
    signatureAnalysis,
  };

  if (!isParameterType(expressionType) && !functionParameterContext) {
    return [];
  }

  // Case 1: Unknown type handling within function parameter context
  if (functionParameterContext && expressionType === 'unknown') {
    return handleUnknownType(enrichedCtx);
  }

  // Case 2: Time interval completions or standard operators
  const timeUnitItems = (() => {
    const paramCtx = functionParameterContext;
    if (!paramCtx || !expressionRoot) {
      return [] as ISuggestionItem[];
    }

    if (!isLiteral(expressionRoot) || !isNumericType(expressionRoot.literalType)) {
      return [] as ISuggestionItem[];
    }

    // Check if function accepts time_duration or date_period parameters
    const acceptedTypes = paramCtx.paramDefinitions.map(({ type }) => type);
    const acceptsTimeParam =
      acceptedTypes.includes('time_duration') || acceptedTypes.includes('date_period');

    if (!acceptsTimeParam) {
      return [] as ISuggestionItem[];
    }

    const hasMoreMandatory = Boolean(paramCtx.hasMoreMandatoryArgs);
    const fnType = paramCtx.functionDefinition?.type;
    const shouldAddComma = hasMoreMandatory && fnType !== FunctionDefinitionTypes.OPERATOR;

    return getTimeUnitLiterals(shouldAddComma, hasMoreMandatory);
  })();

  // If time units are available, return them early (they already include comma if needed)
  if (timeUnitItems.length) {
    return timeUnitItems;
  }

  const paramState = analyzeParameterState(
    expressionRoot,
    expressionType,
    functionParameterContext
  );

  // Check if operators make sense in this context (intelligent filtering)
  const operatorDecision = shouldSuggestOperators({
    expressionType,
    functionParameterContext,
    ctx: enrichedCtx,
  });

  // Get operator suggestions only if they make sense
  const operatorSuggestions = operatorDecision.shouldSuggest
    ? getStandardOperatorSuggestions(enrichedCtx, expressionType)
    : [];

  // Use rule engine to determine if comma should be suggested
  const commaContext: CommaContext = {
    position: 'after_complete',
    typeMatches: paramState.typeMatches,
    isLiteral: paramState.isLiteral,
    hasMoreParams: paramState.hasMoreParams,
    isVariadic: paramState.isVariadic,
    firstArgumentType: functionParameterContext?.firstArgumentType,
    shouldSuggestOperators: operatorDecision.shouldSuggest,
    functionSignatures: functionParameterContext?.validSignatures,
  };

  const includeComma = shouldSuggestComma(commaContext);

  // Build suggestions based on rule engine decision and context
  // Special case: string/IP/version literals can't be extended with operators, only comma
  // Numeric and boolean literals can have operators (arithmetic or logical)
  const isNonExtendableLiteral =
    paramState.isLiteral && !isNumericType(expressionType) && expressionType !== 'boolean';

  if (isNonExtendableLiteral) {
    if (includeComma) {
      return [commaCompleteItem];
    }

    return []; // No comma, no operators for non-extendable literal
  }

  // For non-literals, numeric literals, or boolean literals: include operators and optionally comma
  if (includeComma) {
    return [...operatorSuggestions, commaCompleteItem];
  }

  return operatorSuggestions;
}
