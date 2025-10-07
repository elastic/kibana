/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLColumnData, ISuggestionItem } from '../../../../../commands_registry/types';
import type { SupportedDataType } from '../../../../types';
import { isParameterType } from '../../../../types';
import { argMatchesParamType, getExpressionType } from '../../../expressions';
import { logicalOperators as allLogicalOperators } from '../../../../all_operators';
import { getCompatibleLiterals, getTimeUnitLiterals } from '../../../literals';
import { getOperatorSuggestions } from '../../../operators';
import { isParamExpressionType } from '../../../shared';
import type { FunctionParameterContext } from '../../helpers';
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
import type { ESQLSingleAstItem } from '../../../../../types';

/** Suggests completions after a complete expression (literal, column, or function) */
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
    // acceptedTypes.includes('time_duration') || acceptedTypes.includes('date_period');

    // if (!acceptsTimeParam) {
    // return [] as ISuggestionItem[];
    // }

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
    functionParameterContext,
    context?.columns
  );

  const operatorSuggestions = getStandardOperatorSuggestions(ctx, expressionType);

  // If it's a literal that matches type and there are more params available: only suggest comma
  // (e.g., CONCAT("first" ▌) - literal complete, can't extend, need 2nd param)
  // (e.g., COALESCE("first" ▌) - literal complete, can add optional params)
  if (paramState.isLiteral && paramState.typeMatches && paramState.hasMoreParams) {
    return [commaCompleteItem];
  }

  // If it's a literal that matches type and no more params available: no suggestions
  // (e.g., function with all params complete)
  if (paramState.isLiteral && paramState.typeMatches && !paramState.hasMoreParams) {
    return [];
  }

  // For field references that match type: can extend with operators OR move to next param
  // (e.g., CASE(booleanField ▌) - can add AND/OR, or comma for next param)
  // (e.g., COALESCE(textField ▌) - can add ==, LIKE, etc., or comma for optional params)
  if (paramState.hasMoreParams) {
    return [...operatorSuggestions, commaCompleteItem];
  }

  return operatorSuggestions;
}

/** Analyzes the current function parameter state */
function analyzeParameterState(
  expressionRoot: ESQLSingleAstItem | undefined,
  expressionType: SupportedDataType | 'unknown',
  functionParameterContext: FunctionParameterContext | undefined,
  columns?: Map<string, ESQLColumnData>
): {
  typeMatches: boolean;
  isLiteral: boolean;
  hasMoreParams: boolean;
} {
  if (!functionParameterContext) {
    return { typeMatches: false, isLiteral: false, hasMoreParams: false };
  }

  const hasMoreMandatoryArgs = Boolean(functionParameterContext.hasMoreMandatoryArgs);
  const hasOptionalParams = functionParameterContext.paramDefinitions.some(
    (param) => param.optional === true
  );

  // hasMoreParams is true if there are more mandatory args OR if the function accepts optional params
  const hasMoreParams = hasMoreMandatoryArgs || hasOptionalParams;

  const isLiteralExpression = expressionRoot && isLiteral(expressionRoot);
  const typeMatchesParam = functionParameterContext.paramDefinitions.some((def) =>
    argMatchesParamType(expressionType, def.type, Boolean(isLiteralExpression), false)
  );

  return {
    typeMatches: typeMatchesParam,
    isLiteral: Boolean(isLiteralExpression),
    hasMoreParams,
  };
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
