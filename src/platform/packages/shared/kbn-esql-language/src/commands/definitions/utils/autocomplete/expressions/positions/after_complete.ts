/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../registry/types';
import { isParameterType } from '../../../../types';
import { getTimeUnitLiterals } from '../../../literals';
import type { ExpressionContext } from '../types';
import { isLiteral, isFunctionExpression } from '../../../../../../ast/is';
import { isNumericType, FunctionDefinitionTypes } from '../../../../types';
import { commaCompleteItem } from '../../../../../registry/complete_items';
import { getExpressionType } from '../../../expressions';
import { SignatureAnalyzer } from '../signature_analyzer';
import { getLogicalContinuationSuggestions } from '../operators/utils';
import { shouldSuggestOperators } from './after_complete/should_suggest_operators';
import { SuggestionBuilder } from '../suggestion_builder';
import { logicalOperators } from '../../../../all_operators';

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

    const analyzer = SignatureAnalyzer.from(functionParameterContext);

    // For repeating signatures (CASE): boolean at position 2,4,6... is a condition → suggest comma
    if (analyzer?.isAmbiguousPosition) {
      return [...suggestions, commaCompleteItem];
    }

    if (analyzer?.hasMoreParams) {
      return [...suggestions, commaCompleteItem];
    }

    return suggestions;
  }

  // Enrich context with expression type and signature analysis
  const expressionType = getExpressionType(
    expressionRoot,
    context?.columns,
    context?.unmappedFieldsStrategy
  );
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
    return [];
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

  // Use SignatureAnalyzer for parameter state analysis if available
  const paramState = signatureAnalysis
    ? signatureAnalysis.getParameterState(expressionType, isLiteral(expressionRoot))
    : {
        typeMatches: false,
        isLiteral: false,
        hasMoreParams: false,
        isVariadic: false,
      };

  // Check if operators make sense in this context (intelligent filtering)
  const operatorDecision = shouldSuggestOperators({
    expressionType,
    functionParameterContext,
    ctx: enrichedCtx,
  });

  // Build suggestions using SuggestionBuilder
  const builder = new SuggestionBuilder(enrichedCtx);

  // Special case: string/IP/version literals can't be extended with operators, only comma
  // Numeric and boolean literals can have operators (arithmetic or logical)
  const isNonExtendableLiteral =
    paramState.isLiteral && !isNumericType(expressionType) && expressionType !== 'boolean';

  // Add operator suggestions if they make sense
  if (operatorDecision.shouldSuggest && !isNonExtendableLiteral) {
    const isBooleanLiteral =
      expressionType === 'boolean' && expressionRoot && isLiteral(expressionRoot);

    // Boolean literals (TRUE/FALSE) should only suggest logical operators (AND, OR)
    // Other types use the decision engine's allowed list
    let allowedOperators = operatorDecision.allowedOperators;

    if (isBooleanLiteral) {
      const { location } = ctx;
      allowedOperators = logicalOperators
        .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
        .map(({ name }) => name);
    }

    builder.addOperators({
      leftParamType: expressionType === 'param' ? undefined : expressionType,
      allowed: allowedOperators,
      ignored: ['=', ':'],
    });
  }

  // Add comma if needed (only in function context)
  if (functionParameterContext) {
    builder.addCommaIfNeeded({
      position: 'after_complete',
      typeMatches: paramState.typeMatches,
      isLiteral: paramState.isLiteral,
      hasMoreParams: paramState.hasMoreParams,
      isVariadic: paramState.isVariadic,
      isAmbiguousPosition: signatureAnalysis?.isAmbiguousPosition,
      functionSignatures: signatureAnalysis?.getValidSignatures(),
      expressionType,
      isCursorFollowedByComma: options.isCursorFollowedByComma,
    });
  }

  return builder.build();
}
