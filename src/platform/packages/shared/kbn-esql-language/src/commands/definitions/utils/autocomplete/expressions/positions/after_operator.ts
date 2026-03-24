/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
import type { ISuggestionItem } from '../../../../../registry/types';
import { listCompleteItem } from '../../../../../registry/complete_items';
import type { FunctionDefinition, SupportedDataType } from '../../../../types';
import { FunctionDefinitionTypes, isArrayType } from '../../../../types';
import { getExpressionType } from '../../../expressions';
import {
  hasArbitraryExpressionSignature,
  doesParamAcceptType,
  canAcceptMoreArgs,
  hasVariadicSignature,
} from '../../../signatures';
import { getFunctionDefinition } from '../../../functions';
import { removeFinalUnknownIdentiferArg } from '../../../shared';
import { logicalOperators } from '../../../../all_operators';
import { dispatchOperators } from '../operators/dispatcher';
import type { ExpressionContext } from '../types';
import { SuggestionBuilder } from '../suggestion_builder';
import { shouldSuggestOperators } from './after_complete/should_suggest_operators';
import {
  getIncompleteOperatorReason,
  normalizePreferredExpressionTypes,
  type IncompleteOperatorReason,
} from '../utils';

/**
 * Suggests completions after an operator (e.g., field = |, field IN |)
 * Handles special cases (IN, IS NULL) or delegates to generic operator logic
 */
export async function suggestAfterOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, context } = ctx;

  if (!expressionRoot) {
    return [];
  }

  const rightmostOperator = getRightmostOperatorInFunctionTree(expressionRoot as ESQLFunction);
  // If we don't pass rightmostOperator, for "field IN (x) AND field NOT IN (y"
  // dispatchOperators sees AND (no handler) instead of NOT IN, failing to suggest comma.
  const ctxWithRightmostOperator = { ...ctx, expressionRoot: rightmostOperator };

  const specialSuggestions = await dispatchOperators(ctxWithRightmostOperator);

  if (specialSuggestions) {
    return specialSuggestions;
  }
  const getExprType = (expression: ESQLAstItem) =>
    getExpressionType(expression, context?.columns, context?.unmappedFieldsStrategy);

  const reason = getIncompleteOperatorReason(rightmostOperator, getExprType);
  const complete = reason === undefined;

  if (complete) {
    return handleCompleteOperator(ctx, rightmostOperator, getExprType);
  }

  return handleIncompleteOperator(ctx, rightmostOperator, getExprType, reason);
}

/** Returns supported right-side types for binary operators matching the left-side type */
function getSupportedTypesForBinaryOperators(
  fnDef: FunctionDefinition | undefined,
  previousType: SupportedDataType | 'unknown'
) {
  return fnDef
    ? fnDef.signatures
        .filter(({ params }) =>
          params.find(({ name, type }) => name === 'left' && type === previousType)
        )
        .map(({ params }) => params[1]?.type as SupportedDataType | 'unknown')
        .filter((type) => type !== undefined && !isArrayType(type))
    : [previousType];
}

/**
 * Handles suggestions for complete operator expressions (e.g., field > 0 |)
 * Suggests operators that can continue the expression
 */
function handleCompleteOperator(
  ctx: ExpressionContext,
  operator: ESQLFunction,
  getExprType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
): ISuggestionItem[] {
  const { location, options } = ctx;

  const operatorReturnType = getExprType(operator);
  const builder = new SuggestionBuilder(ctx);

  const operatorDecision = shouldSuggestOperators({
    expressionType: operatorReturnType,
    functionParameterContext: options.functionParameterContext,
    ctx,
  });

  if (operatorDecision.shouldSuggest) {
    let allowed = operatorDecision.allowedOperators;

    if (!allowed && operatorReturnType === 'boolean') {
      allowed = logicalOperators
        .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
        .map(({ name }) => name);
    }

    builder.addOperators({
      leftParamType:
        operatorReturnType === 'unknown' || operatorReturnType === 'unsupported'
          ? 'any'
          : operatorReturnType,
      ignored: ['=', ':'],
      allowed,
    });
  }

  // Add comma using decision engine for all operators in function context
  if (options.functionParameterContext) {
    const fnParamCtx = options.functionParameterContext;
    const typeMatches = doesParamAcceptType(fnParamCtx, operatorReturnType, false);

    builder.addCommaIfNeeded({
      position: 'after_complete',
      typeMatches,
      isLiteral: false,
      hasMoreParams: canAcceptMoreArgs(fnParamCtx),
      isVariadic: hasVariadicSignature(fnParamCtx.signatures),
      hasMoreMandatoryArgs: fnParamCtx.hasMoreMandatoryArgs,
      isExpressionHeavy: hasArbitraryExpressionSignature(
        fnParamCtx.functionDefinition?.signatures ?? []
      ),
      isCursorFollowedByComma: false,
    });
  }

  return builder.build();
}

/**
 * Handles suggestions for incomplete operator expressions (e.g., field > |)
 * Suggests fields, literals, and functions for the right-hand operand
 */
async function handleIncompleteOperator(
  ctx: ExpressionContext,
  operator: ESQLFunction,
  getExprType: (expression: ESQLAstItem) => SupportedDataType | 'unknown',
  reason?: IncompleteOperatorReason
): Promise<ISuggestionItem[]> {
  const { options } = ctx;
  const builder = new SuggestionBuilder(ctx);

  const cleanedArgs = removeFinalUnknownIdentiferArg(operator.args, getExprType);
  const leftArgType = getExprType(operator.args[cleanedArgs.length - 1]);

  if (reason === 'tooFewArgs') {
    const fnDef = getFunctionDefinition(operator.name);

    if (fnDef?.signatures.every(({ params }) => params.some(({ type }) => isArrayType(type)))) {
      return [listCompleteItem];
    }

    // AND/OR special case: suggest broader field/function set instead of just boolean
    const isAndOrWithBooleanLeft =
      leftArgType === 'boolean' &&
      (operator.name === 'and' || operator.name === 'or') &&
      getFunctionDefinition(operator.name)?.type === FunctionDefinitionTypes.OPERATOR;

    const typeToUse = isAndOrWithBooleanLeft
      ? (['any'] as (SupportedDataType | 'unknown' | 'any')[])
      : getSupportedTypesForBinaryOperators(fnDef, leftArgType);

    const useValueType = Boolean(operator.subtype === 'binary-expression');

    await builder
      .addFields({
        types: typeToUse,
        values: useValueType,
        addSpaceAfterField: options.addSpaceAfterOperator ?? false,
        openSuggestions: options.openSuggestions ?? false,
        promoteToTop: true,
      })
      .then((b) =>
        b
          .addLiterals({
            types: typeToUse,
            includeDateLiterals: true,
            includeCompatibleLiterals: false,
            addComma: false,
            advanceCursorAndOpenSuggestions: options.openSuggestions ?? false,
          })
          .addFunctions({
            types: typeToUse,
            addSpaceAfterFunction: options.addSpaceAfterOperator ?? false,
          })
      );
  }

  if (reason === 'wrongTypes') {
    const preferredTypes = normalizePreferredExpressionTypes(options.preferredExpressionType);

    if (leftArgType && preferredTypes.length) {
      if (
        !preferredTypes.includes(leftArgType) &&
        leftArgType !== 'unknown' &&
        leftArgType !== 'unsupported'
      ) {
        builder.addOperators({
          leftParamType: leftArgType,
          returnTypes: preferredTypes,
        });
      }
    }
  }

  return builder.build();
}

/**
 * Finds the deepest binary operator in the right branch of an expression tree.
 *
 * Uses structural right-first traversal instead of position-based detection
 * to avoid ANTLR error recovery issues where incomplete expressions get
 * positions that corrupt location.min values.
 */
function getRightmostOperatorInFunctionTree(fn: ESQLFunction): ESQLFunction {
  const rightArg = fn.args[1];

  if (
    fn.subtype === 'binary-expression' &&
    rightArg &&
    !Array.isArray(rightArg) &&
    rightArg.type === 'function'
  ) {
    return getRightmostOperatorInFunctionTree(rightArg as ESQLFunction);
  }

  return fn;
}
