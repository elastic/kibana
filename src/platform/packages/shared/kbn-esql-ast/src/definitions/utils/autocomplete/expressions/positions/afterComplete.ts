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
import { getFieldsSuggestions, getFunctionsSuggestions } from '../../helpers';
import type { ExpressionContext, FunctionParameterContext } from '../types';
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

    // Check if function accepts time_duration or date_period parameters
    const acceptedTypes = paramCtx.paramDefinitions.map(({ type }) => type);
    const acceptsTimeParam =
      acceptedTypes.includes('time_duration') || acceptedTypes.includes('date_period');

    // Special case: DATE_PARSE accepts keyword but supports time units for epoch time
    // Example: DATE_PARSE(1, "days") means "1 day from epoch"
    const functionName = paramCtx.functionDefinition?.name?.toLowerCase();
    const isDateParseSpecialCase = functionName === 'date_parse';

    if (!acceptsTimeParam && !isDateParseSpecialCase) {
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
    functionParameterContext,
    context?.columns
  );

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

  // Check if operators make sense in this context (intelligent filtering)
  const shouldSuggestOperators = shouldSuggestOperatorsForContext(
    ctx,
    functionParameterContext,
    expressionType
  );

  // Get operator suggestions only if they make sense
  const operatorSuggestions = shouldSuggestOperators
    ? getStandardOperatorSuggestions(ctx, expressionType)
    : [];

  // For field references that match type: can extend with operators OR move to next param
  // (e.g., CASE(booleanField ▌) - can add AND/OR, or comma for next param)
  // (e.g., COALESCE(textField ▌) - operators filtered out, only comma)
  // (e.g., COALESCE(field < field ▌) - operators (AND/OR) and comma)
  if (paramState.hasMoreParams && paramState.typeMatches) {
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
  const hasOptionalParams = functionParameterContext.functionDefinition?.signatures?.some(
    (signature) => signature.params.some((param) => param.optional === true)
  );
  // Check if this is a variadic function (unlimited params, like CASE, CONCAT, COALESCE)
  // Variadic functions have minParams defined, indicating they accept unlimited parameters
  const isVariadicFunction = functionParameterContext.functionDefinition?.signatures?.some(
    (sig) => sig.minParams != null
  );

  // hasMoreParams is true if:
  // - there are more mandatory args, OR
  // - the function accepts optional params, OR
  // - the function is variadic (accepts unlimited params)
  const hasMoreParams =
    hasMoreMandatoryArgs || Boolean(hasOptionalParams) || Boolean(isVariadicFunction);

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

/**
 * Determines if operators should be suggested based on the current context.
 *
 * Core logic: For functions with type homogeneity (COALESCE, CONCAT, etc.),
 * operators should be suggested based on the type of the FIRST parameter.
 *
 * Key insight: comparison operators (>, ==, LIKE) produce boolean values.
 *
 * Examples:
 * - WHERE bytes > 1 (expects boolean, > produces boolean)
 * - COALESCE(agent > agent, agent ...)  (first param is boolean, so second param can use operators)
 * - COALESCE(textField, agent ...)  (first param is text, so second param should NOT use comparison operators)
 * - CONCAT(text, ...)  (first param is text, NO comparison operators)
 * - CASE(cond, value > 5, ...) (value accepts 'any', can be boolean expression)
 *
 * Multi-signature handling:
 * Functions like COALESCE have multiple signatures for different types.
 * We check the first parameter's type to determine which signature is active.
 * If first param is boolean, all params must be boolean → suggest operators
 * If first param is NOT boolean and function requires homogeneity → DON'T suggest comparison operators
 */
function shouldSuggestOperatorsForContext(
  ctx: ExpressionContext,
  functionParameterContext: FunctionParameterContext | undefined,
  expressionType: SupportedDataType | 'unknown'
): boolean {
  if (!functionParameterContext) {
    return true;
  }

  const paramDefs = functionParameterContext.paramDefinitions;

  if (!paramDefs || paramDefs.length === 0) {
    return true;
  }

  // If parameter accepts 'any' type, operators are useful (can build any expression)
  const acceptsAny = paramDefs.some((def) => def.type === 'any');

  if (acceptsAny) {
    return true;
  }

  // If the expression already typed is boolean, operators make sense
  // (logical operators for boolean, comparison operators produce boolean)
  if (expressionType === 'boolean') {
    return true;
  }

  const signatures = functionParameterContext.functionDefinition?.signatures;

  if (!signatures || signatures.length === 0) {
    return true;
  }

  // Check if function requires type homogeneity
  const requiresHomogeneity = signatures.every((sig) => {
    const isVariadic = sig.minParams != null;

    if (!isVariadic && sig.params.length < 2) {
      return false;
    }

    const firstParamType = sig.params[0].type;

    if (firstParamType === 'any') {
      return false;
    }

    return sig.params.every((param) => {
      if (param.type === firstParamType) {
        return true;
      }

      // keyword and text are interchangeable in ES|QL
      if (
        (firstParamType === 'keyword' || firstParamType === 'text') &&
        (param.type === 'keyword' || param.type === 'text')
      ) {
        return true;
      }

      return false;
    });
  });

  if (!requiresHomogeneity) {
    return true;
  }

  // Function requires homogeneity - check the first parameter's type
  const firstParamType = functionParameterContext.firstArgumentType;

  // If we can't determine first param type, be permissive (suggest operators)
  if (!firstParamType || firstParamType === 'unknown') {
    return true;
  }

  // Special case: editing the first parameter (expressionType matches firstParamType)
  if (firstParamType === expressionType) {
    const isEditingFirstParam = functionParameterContext.currentParameterIndex === 0;

    if (isEditingFirstParam) {
      // COALESCE(textField ▌) - still at first param, user can still change signature
      // Suggest operators if function has boolean signature (user can add "> 'x'" to switch)
      const hasBooleanSignature = signatures.some((sig) => {
        if (sig.params.length === 0) {
          return false;
        }

        return sig.params[0].type === 'boolean';
      });

      return hasBooleanSignature;
    }

    // COALESCE(textField, textField ▌) - at second+ param, signature already chosen
    // Only suggest operators if first param was boolean (logical operators AND/OR)
    return firstParamType === 'boolean';
  }

  // If first param is boolean, all params must be boolean → suggest operators
  if (firstParamType === 'boolean') {
    return true;
  }

  // First param is NOT boolean, function requires homogeneity
  // → DON'T suggest comparison operators (they would produce boolean, breaking homogeneity)
  return false;
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
    let acceptedTypes = getAcceptedTypesForParamContext(functionDefinition.name, paramDefinitions, {
      isCaseWithEmptyParams,
    });

    // Special case: for functions with homogeneity where first param is boolean,
    // suggest ALL field types (not just boolean) because user can add operators
    // Example: COALESCE(agent < agent, ▌) - should suggest all fields, not just boolean
    const firstParamIsBoolean = functionParameterContext.firstArgumentType === 'boolean';

    if (firstParamIsBoolean && acceptedTypes.length === 1 && acceptedTypes[0] === 'boolean') {
      // Suggest all types - user can build boolean expressions with operators
      acceptedTypes = ['any'];
    }

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
