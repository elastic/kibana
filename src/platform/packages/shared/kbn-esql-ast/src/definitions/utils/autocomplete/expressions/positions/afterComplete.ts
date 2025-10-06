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
import { getExpressionType } from '../../../expressions';
import { logicalOperators as allLogicalOperators } from '../../../../all_operators';
import { getCompatibleLiterals, getTimeUnitLiterals } from '../../../literals';
import { getOperatorSuggestions } from '../../../operators';
import { isParamExpressionType } from '../../../shared';
import { getFieldsSuggestions, getFunctionsSuggestions } from '../../helpers';
import type { ExpressionContext } from '../types';
import { matchesSpecialFunction } from '../utils';
import { isLiteral } from '../../../../../ast/is';
import { isNumericType, FunctionDefinitionTypes } from '../../../../types';
import { commaCompleteItem } from '../../../../../commands_registry/complete_items';
import { getAcceptedTypesForParamContext } from '../operators/utils';
import {
  getActiveProductFromCtx,
  getColumnsByTypeFromCtx,
  getLicenseCheckerFromCtx,
} from '../utils';
import { ensureKeywordAndText } from '../../functions';

/**
 * Suggests completions after a complete expression (literal, column, or function)
 *
 * Handles three main cases:
 * 1. Unknown type expressions within function parameters
 * 2. Boolean conditions inside functions (e.g., CASE)
 * 3. Standard operator suggestions with special handling for:
 *    - Time interval completions (1 hour, 2 days, etc.)
 *    - Boolean literals (logical operators only)
 */
export async function suggestAfterComplete(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, context, options } = ctx;
  const { functionParameterContext } = options;
  const expressionType = getExpressionType(expressionRoot, context?.columns);

  if (!isParameterType(expressionType) && !functionParameterContext) {
    return [];
  }

  // Case 1: Unknown type handling within function parameter context
  if (functionParameterContext && expressionType === 'unknown') {
    return handleUnknownType(ctx);
  }

  const suggestions: ISuggestionItem[] = [];

  // Case 2: Time interval completions or standard operators
  const timeUnitItems = (() => {
    const paramCtx = functionParameterContext;
    if (!paramCtx || !expressionRoot) {
      return [] as ISuggestionItem[];
    }

    if (!isLiteral(expressionRoot) || !isNumericType((expressionRoot as any).literalType)) {
      return [] as ISuggestionItem[];
    }

    // TODO: reintroduce this check to only show time units for functions that accept time params? it measn it doesn't work for functions like DATE_PARSE that want stings
    // const acceptedTypes = paramCtx.paramDefinitions.map(({ type }) => type);
    // const acceptsTimeParam =
    //   acceptedTypes.includes('time_duration') || acceptedTypes.includes('date_period');

    // if (!acceptsTimeParam) {
    //   return [] as ISuggestionItem[];
    // }

    const hasMoreMandatory = Boolean(paramCtx.hasMoreMandatoryArgs);
    const fnType = paramCtx.functionDefinition?.type;
    const shouldAddComma = hasMoreMandatory && fnType !== FunctionDefinitionTypes.OPERATOR;

    return getTimeUnitLiterals(shouldAddComma, hasMoreMandatory);
  })();

  const nextItems = timeUnitItems.length
    ? timeUnitItems
    : getStandardOperatorSuggestions(ctx, expressionType);

  suggestions.push(...nextItems);

  // Add comma if we have more mandatory args in the function
  if (functionParameterContext?.hasMoreMandatoryArgs && !timeUnitItems.length) {
    suggestions.push(commaCompleteItem);
  }

  return suggestions;
}

/** Handles suggestions for expressions with unknown types within function parameters */
async function handleUnknownType(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { location, context, options } = ctx;
  const { functionParameterContext } = options;

  if (!functionParameterContext?.functionDefinition) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];
  const {
    paramDefinitions,
    functionDefinition,
    hasMoreMandatoryArgs = false,
    functionsToIgnore,
  } = functionParameterContext;

  // Separate parameter definitions by type
  const constantOnlyParamDefs = paramDefinitions.filter(({ constantOnly }) => constantOnly);
  const nonConstantParamDefs = paramDefinitions.filter(({ constantOnly }) => !constantOnly);

  // Add literal suggestions for constant-only parameters
  if (constantOnlyParamDefs.length > 0) {
    const literalTypes = ensureKeywordAndText(constantOnlyParamDefs.map(({ type }) => type));
    suggestions.push(
      ...getCompatibleLiterals(
        literalTypes,
        { supportsControls: context?.supportsControls },
        context?.variables
      )
    );
  }

  // Check for special CASE function handling
  const isCase = matchesSpecialFunction(functionDefinition.name, 'case');
  const isCaseWithEmptyParams = isCase && paramDefinitions.length === 0;

  // Add field and function suggestions for non-constant parameters
  if (nonConstantParamDefs.length > 0 || isCaseWithEmptyParams) {
    const acceptedTypes = getAcceptedTypesForParamContext(
      functionDefinition.name,
      paramDefinitions,
      { isCaseWithEmptyParams }
    );

    // Add field suggestions
    suggestions.push(
      ...(await getFieldsSuggestions(
        acceptedTypes,
        (t, ig, o) => getColumnsByTypeFromCtx(ctx, t, ig, o),
        {
          addSpaceAfterField: hasMoreMandatoryArgs,
          openSuggestions: true,
          addComma: hasMoreMandatoryArgs,
          promoteToTop: true,
        }
      ))
    );

    // Add function suggestions
    suggestions.push(
      ...getFunctionsSuggestions({
        location,
        types: acceptedTypes,
        options: { ignored: functionsToIgnore },
        context,
        callbacks: { hasMinimumLicenseRequired: getLicenseCheckerFromCtx(ctx) },
      })
    );
  }

  return suggestions;
}

/** Gets standard operator suggestions based on expression type and position */
function getStandardOperatorSuggestions(
  ctx: ExpressionContext,
  expressionType: string
): ISuggestionItem[] {
  const { location, position } = ctx;
  const isBooleanAfterLiteral = expressionType === 'boolean' && position === 'after_literal';

  // Filter logical operators for boolean literals
  const allowed = isBooleanAfterLiteral
    ? allLogicalOperators
        .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
        .map(({ name }) => name)
    : undefined;

  return getOperatorSuggestions(
    {
      location,
      leftParamType: isParamExpressionType(expressionType) ? undefined : expressionType,
      allowed,
      ignored: ['='],
    },
    getLicenseCheckerFromCtx(ctx),
    getActiveProductFromCtx(ctx)
  );
}
