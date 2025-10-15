/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../commands_registry/types';
import type { SupportedDataType } from '../../../../../types';
import { argMatchesParamType } from '../../../../expressions';
import { logicalOperators as allLogicalOperators } from '../../../../../all_operators';
import { getCompatibleLiterals } from '../../../../literals';
import { getOperatorSuggestions } from '../../../../operators';
import { isParamExpressionType } from '../../../../shared';
import type { ExpressionContext, FunctionParameterContext } from '../../types';
import { isLiteral } from '../../../../../../ast/is';
import { ensureKeywordAndText } from '../../../functions';
import type { ESQLSingleAstItem } from '../../../../../../types';
import { SignatureAnalyzer } from '../../SignatureAnalyzer';
import { SuggestionBuilder } from '../../SuggestionBuilder';
import { shouldSuggestOperators } from './shouldSuggestOperators';

/** Analyzes the current function parameter state */
export function analyzeParameterState(
  expressionRoot: ESQLSingleAstItem | undefined,
  expressionType: SupportedDataType | 'unknown',
  functionParameterContext: FunctionParameterContext | undefined
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
  const signatures = functionParameterContext.validSignatures;
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
  const hasParamDefinitions = functionParameterContext.paramDefinitions?.length > 0;

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

/** Handles suggestions for expressions with unknown types within function parameters */
export async function handleUnknownType(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { context, options } = ctx;
  const { functionParameterContext } = options;

  if (!functionParameterContext?.functionDefinition) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];
  const {
    paramDefinitions,
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

  // Add field and function suggestions for parameters
  // Enter if: has non-constant params, OR no params yet, OR only constant params (still suggest functions)
  if (
    paramDefinitions.length === 0 ||
    nonConstantParamDefs.length > 0 ||
    paramDefinitions.every(({ constantOnly }) => constantOnly)
  ) {
    // Use SignatureAnalyzer to get accepted types (handles homogeneity logic)
    const analyzer = SignatureAnalyzer.from(functionParameterContext);
    const acceptedTypes = analyzer
      ? analyzer.getAcceptedTypes()
      : ensureKeywordAndText(paramDefinitions.map(({ type }) => type));

    // Use SuggestionBuilder to add field and function suggestions
    const builder = new SuggestionBuilder(ctx);

    await builder.addFields({
      types: acceptedTypes,
      addComma: hasMoreMandatoryArgs,
      promoteToTop: true,
    });

    builder.addFunctions({
      types: acceptedTypes,
      ignoredFunctions: functionsToIgnore,
    });

    suggestions.push(...builder.build());
  }

  return suggestions;
}

/** Gets standard operator suggestions based on expression type and position */
export function getStandardOperatorSuggestions(
  ctx: ExpressionContext,
  expressionType: string
): ISuggestionItem[] {
  const { location, options, expressionRoot } = ctx;
  const isBooleanLiteral =
    expressionType === 'boolean' && expressionRoot && isLiteral(expressionRoot);

  // Determine operator filtering based on context
  let allowed: string[] | undefined;
  const ignored: string[] = ['='];

  // Filter logical operators for boolean literals (true /, false /)
  if (isBooleanLiteral) {
    allowed = allLogicalOperators
      .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
      .map(({ name }) => name);
  } else {
    // Use priority-based rules to determine allowed operators
    const decision = shouldSuggestOperators({
      expressionType: expressionType as SupportedDataType | 'unknown',
      functionParameterContext: options.functionParameterContext,
      ctx,
    });

    allowed = decision.allowedOperators;
  }

  return getOperatorSuggestions(
    {
      location,
      leftParamType: isParamExpressionType(expressionType) ? undefined : expressionType,
      allowed,
      ignored,
    },
    ctx.callbacks?.hasMinimumLicenseRequired,
    ctx.context?.activeProduct
  );
}
