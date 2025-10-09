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
import {
  arithmeticOperators,
  logicalOperators as allLogicalOperators,
} from '../../../../all_operators';
import { getCompatibleLiterals, getTimeUnitLiterals } from '../../../literals';
import { getOperatorSuggestions } from '../../../operators';
import { isParamExpressionType } from '../../../shared';
import { getFieldsSuggestions, getFunctionsSuggestions } from '../../helpers';
import type { ExpressionContext, FunctionParameterContext } from '../types';
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
import { shouldSuggestComma, type CommaContext } from '../commaDecisionEngine';

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
    functionParameterContext,
    context?.columns
  );

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

  // Use rule engine to determine if comma should be suggested
  const commaContext: CommaContext = {
    position: 'after_complete',
    typeMatches: paramState.typeMatches,
    isLiteral: paramState.isLiteral,
    hasMoreParams: paramState.hasMoreParams,
    isVariadic: paramState.isVariadic,
    firstArgumentType: functionParameterContext?.firstArgumentType,
    shouldSuggestOperators,
    functionSignatures: functionParameterContext?.functionDefinition?.signatures,
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
  isVariadic: boolean;
} {
  if (!functionParameterContext) {
    return { typeMatches: false, isLiteral: false, hasMoreParams: false, isVariadic: false };
  }

  const hasMoreMandatoryArgs = Boolean(functionParameterContext.hasMoreMandatoryArgs);

  const signatures =
    functionParameterContext.validSignatures ??
    functionParameterContext.functionDefinition?.signatures;
  // Check if this is a variadic function (unlimited params, like CASE, CONCAT, COALESCE)
  // Variadic functions have minParams defined, indicating they accept unlimited parameters
  const isVariadicFunction = signatures?.some((sig) => sig.minParams != null);

  // Check if we've reached the maximum number of parameters
  // For non-variadic functions, check if current parameter index >= max params
  const currentParamIndex = functionParameterContext.currentParameterIndex ?? 0;
  const maxParams = signatures ? Math.max(...signatures.map((sig) => sig.params.length)) : 0;
  const isAtMaxParams = !isVariadicFunction && currentParamIndex >= maxParams - 1;

  // hasMoreParams is true if:
  // - there are more mandatory args, OR
  // - the function is variadic (accepts unlimited params), OR
  // - we haven't reached the max number of parameters yet
  const hasMoreParams =
    hasMoreMandatoryArgs || Boolean(isVariadicFunction) || (!isAtMaxParams && maxParams > 0);

  const isLiteralExpression = expressionRoot && isLiteral(expressionRoot);
  const hasParamDefinitions =
    functionParameterContext.paramDefinitions &&
    functionParameterContext.paramDefinitions.length > 0;

  let typeMatchesParam: boolean;

  if (hasParamDefinitions) {
    // Normal case: check if expression type matches any param definition
    typeMatchesParam = functionParameterContext.paramDefinitions.some((def) =>
      argMatchesParamType(expressionType, def.type, Boolean(isLiteralExpression), false)
    );
  } else if (isVariadicFunction && functionParameterContext.firstArgumentType) {
    // No param definitions but it's a variadic function with firstArgumentType
    // For homogeneous functions (COALESCE, CONCAT), check if current type matches first arg type
    typeMatchesParam = argMatchesParamType(
      expressionType,
      functionParameterContext.firstArgumentType,
      Boolean(isLiteralExpression),
      false
    );
  } else {
    // No param definitions and no firstArgumentType: assume no match
    typeMatchesParam = false;
  }

  return {
    typeMatches: typeMatchesParam,
    isLiteral: Boolean(isLiteralExpression),
    hasMoreParams,
    isVariadic: Boolean(isVariadicFunction),
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
 * - COALESCE(agent > agent, agent ...) (first param is boolean, so second param can use operators)
 * - COALESCE(textField, agent ...) (first param is text, so second param should NOT use comparison operators)
 * - CONCAT(text, ...) (first param is text, NO comparison operators)
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
    // No param definitions: for variadic functions with homogeneity,
    // check if first argument was boolean (then allow operators)
    const firstArgType = functionParameterContext.firstArgumentType;

    if (firstArgType === 'boolean') {
      return true; // COALESCE(boolField, boolField, boolField ▌) → operators OK
    }

    // First arg is NOT boolean: for homogeneous functions, no comparison operators
    // Example: COALESCE(textField, textField, textField ▌) → NO operators, just comma
    const isVariadic = functionParameterContext.functionDefinition?.signatures?.some(
      (sig) => sig.minParams != null
    );

    if (isVariadic && firstArgType && firstArgType !== 'boolean') {
      return false; // No operators for non-boolean homogeneous variadic functions
    }

    return true; // Default: allow operators
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

  // Add field and function suggestions for non-constant parameters
  // Also enter for empty paramDefinitions (first position in any function)
  if (nonConstantParamDefs.length > 0 || paramDefinitions.length === 0) {
    let acceptedTypes = getAcceptedTypesForParamContext(paramDefinitions);

    // Special case: for functions with homogeneity, handle type constraints
    const { firstArgumentType } = functionParameterContext;
    const signatures = functionDefinition.signatures;

    const requiresHomogeneity =
      signatures?.every((sig) => {
        const isVariadic = sig.minParams != null;
        if (!isVariadic && sig.params.length < 2) return false;
        const firstParamType = sig.params[0].type;
        if (firstParamType === 'any') return false;
        return sig.params.every((param) => {
          if (param.type === firstParamType) return true;
          // keyword and text are interchangeable in ES|QL
          return (
            (firstParamType === 'keyword' || firstParamType === 'text') &&
            (param.type === 'keyword' || param.type === 'text')
          );
        });
      }) ?? false;

    if (
      requiresHomogeneity &&
      firstArgumentType === 'boolean' &&
      acceptedTypes.length === 1 &&
      acceptedTypes[0] === 'boolean'
    ) {
      // For boolean homogeneity, suggest ALL types because user can build boolean expressions with operators
      // Example: COALESCE(agent < agent, ▌) - should suggest all fields, not just boolean
      acceptedTypes = ['any'];
    } else if (requiresHomogeneity && firstArgumentType && firstArgumentType !== 'unknown') {
      // For other types (text, numeric), enforce homogeneity by filtering accepted types
      const isTextual = firstArgumentType === 'text' || firstArgumentType === 'keyword';
      acceptedTypes = isTextual ? ['text', 'keyword'] : [firstArgumentType];
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

/** Checks if current parameter accepts only numeric values */
function isNumericParameter(
  functionParameterContext: FunctionParameterContext | undefined
): boolean {
  if (!functionParameterContext?.paramDefinitions) {
    return false;
  }

  // Check if ALL param definitions accept numeric types
  return functionParameterContext.paramDefinitions.every((param) => isNumericType(param.type));
}

/** Gets standard operator suggestions based on expression type and position */
function getStandardOperatorSuggestions(
  ctx: ExpressionContext,
  expressionType: string
): ISuggestionItem[] {
  const { location, position, options } = ctx;
  const isBooleanAfterLiteral = expressionType === 'boolean' && position === 'after_literal';

  // Determine operator filtering based on context
  let allowed: string[] | undefined;
  const ignored: string[] = ['='];

  // Filter logical operators for boolean literals
  if (isBooleanAfterLiteral) {
    allowed = allLogicalOperators
      .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
      .map(({ name }) => name);
  }

  // Filter operators for numeric parameters: only arithmetic operators
  // This applies to any function (scalar, aggregation) when parameter is numeric
  if (isNumericParameter(options.functionParameterContext) && isNumericType(expressionType)) {
    // Only suggest arithmetic operators for numeric parameters
    allowed = arithmeticOperators.map(({ name }) => name);
  }

  return getOperatorSuggestions(
    {
      location,
      leftParamType: isParamExpressionType(expressionType) ? undefined : expressionType,
      allowed,
      ignored,
    },
    getLicenseCheckerFromCtx(ctx),
    getActiveProductFromCtx(ctx)
  );
}
