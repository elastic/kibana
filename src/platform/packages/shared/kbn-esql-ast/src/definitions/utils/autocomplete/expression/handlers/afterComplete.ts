/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isLiteral } from '../../../../../ast/is';
import type { ItemKind, ISuggestionItem } from '../../../../../commands_registry/types';
import { commaCompleteItem } from '../../../../../commands_registry/complete_items';
import { timeUnitsToSuggest } from '../../../../constants';
import { isParameterType, isNumericType, FunctionDefinitionTypes } from '../../../../types';
import { getExpressionType } from '../../../expressions';
import { comparisonFunctions, logicalOperators } from '../../../../all_operators';
import { buildConstantsDefinitions } from '../../../literals';
import { getCompatibleLiterals } from '../../../literals';
import { getOperatorSuggestions } from '../../../operators';
import { isParamExpressionType } from '../../../shared';
import { pushItUpInTheList } from '../../helpers';
import { getFunctionSuggestions } from '../../../functions';
import type { ExpressionContext } from '../context';
import { ensureKeywordAndText, isFunction } from '../utils';

/**
 * Handles suggestions after a complete expression (literal, column, or function)
 *
 * This handler covers three similar positions:
 * - after_literal: field > 10 /
 * - after_column: WHERE field /
 * - after_function: WHERE fn() /
 *
 * All three cases suggest operators or special function-parameter-specific items:
 * - Time interval completions (1 hour, 2 days, etc.)
 * - Boolean condition operators (for CASE function)
 * - Comma suggestions (when more mandatory args exist)
 */
export async function handleAfterComplete(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, location, context, env, options } = ctx;
  const { functionParameterContext } = options;
  const suggestions: ISuggestionItem[] = [];
  const expressionType = getExpressionType(expressionRoot, context?.columns);
  const position = ctx.position!;

  if (!isParameterType(expressionType) && !functionParameterContext) {
    return suggestions;
  }

  // Case 1: Unknown type handling within function parameter context
  // Examples: CASE condition, function parameters with unknown types
  if (functionParameterContext && expressionType === 'unknown') {
    const { paramDefinitions, functionDefinition } = functionParameterContext;
    if (!functionDefinition) {
      return suggestions;
    }

    const constantOnlyParamDefs = paramDefinitions.filter(({ constantOnly }) => constantOnly);
    const nonConstantParamDefs = paramDefinitions.filter(({ constantOnly }) => !constantOnly);

    if (constantOnlyParamDefs.length > 0) {
      suggestions.push(
        ...getCompatibleLiterals(
          ensureKeywordAndText(constantOnlyParamDefs.map((p) => p.type)),
          { supportsControls: context?.supportsControls },
          context?.variables
        )
      );
    }

    const isCase = isFunction(functionDefinition.name, 'case');
    const isCaseWithEmptyParams = isCase && paramDefinitions.length === 0;

    if (nonConstantParamDefs.length > 0 || isCaseWithEmptyParams) {
      const isBooleanCondition =
        isCase ||
        paramDefinitions.some(({ type, name }) => type === 'boolean' && name === 'condition');

      const acceptedTypes =
        isBooleanCondition || isCaseWithEmptyParams
          ? ['any']
          : ensureKeywordAndText(nonConstantParamDefs.map(({ type }) => type));

      const hasMoreMandatoryArgs = functionParameterContext.hasMoreMandatoryArgs ?? false;
      const columnSuggestions = await env.getColumnsByType(acceptedTypes, [], {
        advanceCursor: hasMoreMandatoryArgs,
        openSuggestions: true,
        addComma: hasMoreMandatoryArgs,
      });
      suggestions.push(...pushItUpInTheList(columnSuggestions, true));

      suggestions.push(
        ...getFunctionSuggestions(
          {
            location,
            returnTypes: acceptedTypes,
            ignored: functionParameterContext.functionsToIgnore,
          },
          env.hasMinimumLicenseRequired,
          env.activeProduct
        )
      );
    }

    return suggestions;
  }

  // Case 2: Boolean condition inside function parameter (e.g., CASE)
  // Example: CASE field / → suggest comparison operators (==, !=, etc.)
  const canBeBooleanCondition = functionParameterContext?.paramDefinitions?.some(
    ({ type, name }) => type === 'boolean' && name === 'condition'
  );

  if (canBeBooleanCondition) {
    suggestions.push(
      ...comparisonFunctions.map<ISuggestionItem>(({ name, description }) => ({
        label: name,
        text: name,
        kind: 'Function' as ItemKind,
        detail: description,
      })),
      commaCompleteItem
    );

    return suggestions;
  }

  // Case 3: Time interval completions after numeric literal
  // Example: 1 / → suggest hour, day, week, etc.
  let suggestedIntervals = false;

  if (
    functionParameterContext &&
    isLiteral(expressionRoot) &&
    isNumericType(expressionRoot.literalType)
  ) {
    const { paramDefinitions, hasMoreMandatoryArgs, functionDefinition } = functionParameterContext;

    if (!functionDefinition) {
      return suggestions;
    }

    const acceptedTypes = paramDefinitions.map(({ type }) => type);

    // Suggest time units if parameter expects time_duration or date_period
    if (acceptedTypes.includes('time_duration') || acceptedTypes.includes('date_period')) {
      suggestedIntervals = true;
      const shouldAddComma =
        hasMoreMandatoryArgs && functionDefinition.type !== FunctionDefinitionTypes.OPERATOR;
      suggestions.push(
        ...buildConstantsDefinitions(
          timeUnitsToSuggest.map(({ name }) => name),
          undefined,
          undefined,
          { addComma: shouldAddComma, advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs }
        )
      );

      // Add comma if there are more mandatory arguments to follow
      if (shouldAddComma || hasMoreMandatoryArgs) {
        suggestions.push(commaCompleteItem);
      }
    }
  }

  if (!suggestedIntervals) {
    const allowedOperators =
      expressionType === 'boolean' && position === 'after_literal'
        ? logicalOperators
            .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
            .map(({ name }) => name)
        : undefined;

    suggestions.push(
      ...getOperatorSuggestions(
        {
          location,
          leftParamType: isParamExpressionType(expressionType) ? undefined : expressionType,
          ignored: ['='],
          allowed: allowedOperators,
        },
        env.hasMinimumLicenseRequired,
        env.activeProduct
      )
    );
  }

  return suggestions;
}
