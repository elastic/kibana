/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType } from '@kbn/esql-types';
import { uniq } from 'lodash';
import type { ISuggestionItem, Location } from '../../../../../commands_registry/types';
import { allStarConstant } from '../../../../../commands_registry/complete_items';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../../../constants';
import type { FunctionParameterType } from '../../../../types';
import { FunctionDefinitionTypes } from '../../../../types';
import { getFunctionSuggestions } from '../../../functions';
import { getCompatibleLiterals, getDateLiterals } from '../../../literals';
import { buildValueDefinitions } from '../../../values';
import { getControlSuggestionIfSupported, pushItUpInTheList } from '../../helpers';
import { ensureKeywordAndText, isFunction, isCommand } from '../utils';
import type { ExpressionContext } from '../context';

interface ParamDefinition {
  type: FunctionParameterType;
  constantOnly?: boolean;
  suggestedValues?: string[];
  fieldsOnly?: boolean;
  name?: string;
}

interface FunctionDef {
  name: string;
  type: string;
}

/**
 * Handles suggestions when starting a new expression (empty position).
 *
 * - Function parameter context (if inside a function)
 * - Date literals for date parameters in WHERE/EVAL
 * - Control variables for constantOnly parameters
 * - Field/column suggestions
 * - Function suggestions
 * - Literal value suggestions
 *
 */
export async function handleEmptyExpression({
  location,
  context,
  env,
  options,
  command,
}: ExpressionContext): Promise<ISuggestionItem[]> {
  const functionParamContext = options.functionParameterContext;

  // Inside a function parameter: complex logic for parameter-specific suggestions
  if (functionParamContext) {
    return handleFunctionParameterContext(
      functionParamContext,
      location,
      context,
      env,
      command.name,
      options.ignoredColumnsForEmptyExpression,
      options.isCursorFollowedByComma
    );
  }

  // Top-level expression: suggest any field, function, or control variable
  return handleDefaultContext(
    location,
    context,
    env,
    options.ignoredColumnsForEmptyExpression,
    options.advanceCursorAfterInitialColumn
  );
}

/**
 * Handles suggestions when cursor is inside a function parameter (empty position).
 * - Parameter type constraints (date, boolean, constant-only, etc.)
 * - Function-specific rules (COUNT(*), CASE, etc.)
 * - Command context (WHERE/EVAL for date literals)
 */
async function handleFunctionParameterContext(
  functionParamContext: NonNullable<ExpressionContext['options']['functionParameterContext']>,
  location: Location,
  context: ExpressionContext['context'],
  env: ExpressionContext['env'],
  commandName: string,
  ignoredColumns: string[] = [],
  isCursorFollowedByComma = false
): Promise<ISuggestionItem[]> {
  const { paramDefinitions, functionDefinition } = functionParamContext;

  if (!functionDefinition) {
    return [];
  }

  // Empty paramDefinitions = no valid signature for this position → return []
  // Example: FUNC(double, double, /) with only 1-2 param signatures → suggest nothing
  //
  // Exceptions (continue suggesting):
  // 1. CASE: special syntax with unlimited WHEN/THEN/ELSE pairs
  // 2. Variadic (CONCAT, COALESCE): minParams defined, accepts unlimited params
  const isCase = isFunction(functionDefinition.name, 'case');
  const isCaseWithEmptyParams = isCase && paramDefinitions.length === 0;
  const isVariadicFunction = functionDefinition.signatures?.some((sig) => sig.minParams != null);

  if (paramDefinitions.length === 0 && !isCaseWithEmptyParams && !isVariadicFunction) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  // COUNT(*) special case: suggest asterisk for first parameter
  if (isFunction(functionDefinition.name, 'count')) {
    suggestions.push(allStarConstant);
  }

  // Compute suggestion configuration (types, comma handling, etc.)
  const { acceptedTypes, shouldAddComma, allowFieldsAndFunctions } = computeSuggestionConfig(
    functionParamContext,
    paramDefinitions,
    functionDefinition,
    isCursorFollowedByComma
  );

  const hasMoreMandatoryArgs = Boolean(functionParamContext.hasMoreMandatoryArgs);

  // If parameters have predefined suggested values, return those exclusively
  const suggestedValues = collectSuggestedValues(paramDefinitions);

  if (suggestedValues.length > 0) {
    return buildValueDefinitions(suggestedValues, {
      addComma: shouldAddComma,
      advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
    });
  }

  // Add literal suggestions for constant-only parameters (e.g., duration strings)
  const constantOnlyParams = getConstantOnlyParams(paramDefinitions);

  if (constantOnlyParams.length > 0) {
    suggestions.push(
      ...getCompatibleLiterals(
        ensureKeywordAndText(constantOnlyParams.map(({ type }) => type)),
        {
          supportsControls: context?.supportsControls,
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
        },
        context?.variables
      )
    );
  }

  // Add date literals for date parameters in WHERE/EVAL (but not full-text search functions)
  if (shouldAddDateLiterals(paramDefinitions, commandName, functionDefinition.name)) {
    suggestions.push(
      ...getDateLiterals({
        addComma: shouldAddComma,
        advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
      })
    );
  }

  // Add field/column suggestions (if not constant-only parameters)
  if (allowFieldsAndFunctions && env.getColumnsByType) {
    const columnSuggestions = await env.getColumnsByType(acceptedTypes, ignoredColumns, {
      advanceCursor: shouldAddComma,
      openSuggestions: true,
      addComma: shouldAddComma,
    });
    suggestions.push(...pushItUpInTheList(columnSuggestions, true));
  }

  // Add function suggestions (if not fields-only parameters)
  if (allowFieldsAndFunctions && paramDefinitions.every(({ fieldsOnly }) => !fieldsOnly)) {
    const functionSuggestions = getFunctionSuggestions(
      {
        location,
        returnTypes: acceptedTypes,
        ignored: functionParamContext.functionsToIgnore || [],
      },
      env.hasMinimumLicenseRequired,
      env.activeProduct
    );

    if (shouldAddComma) {
      suggestions.push(
        ...functionSuggestions.map((suggestion) => ({ ...suggestion, text: suggestion.text + ',' }))
      );
    } else {
      suggestions.push(...functionSuggestions);
    }
  }

  return suggestions;
}

async function handleDefaultContext(
  location: Location,
  context: ExpressionContext['context'],
  env: ExpressionContext['env'],
  ignoredColumns: string[] = [],
  advanceCursor = true
): Promise<ISuggestionItem[]> {
  const suggestions: ISuggestionItem[] = [];
  const acceptedTypes: FunctionParameterType[] = ['any'];

  if (env.getColumnsByType) {
    const columnSuggestions = await env.getColumnsByType(acceptedTypes, ignoredColumns, {
      advanceCursor,
      openSuggestions: true,
    });
    suggestions.push(...pushItUpInTheList(columnSuggestions, true));
  }

  suggestions.push(
    ...getFunctionSuggestions(
      { location, returnTypes: acceptedTypes },
      env.hasMinimumLicenseRequired,
      env.activeProduct
    )
  );

  if (context?.supportsControls) {
    suggestions.push(
      ...getControlSuggestionIfSupported(true, ESQLVariableType.VALUES, context.variables)
    );
  }

  return suggestions;
}

/**
 * Collects all unique suggested values from parameter definitions.
 * Used when parameters have predefined values (e.g., enums).
 */
function collectSuggestedValues(paramDefinitions: ParamDefinition[]): string[] {
  return uniq(
    paramDefinitions
      .map(({ suggestedValues }) => suggestedValues)
      .filter((values): values is string[] => Boolean(values))
      .flat()
  );
}

/**
 * Filters parameters that only accept constant values (literals).
 * Includes parameters marked as constantOnly or duration types.
 */
function getConstantOnlyParams(paramDefinitions: ParamDefinition[]): ParamDefinition[] {
  return paramDefinitions.filter(
    ({ constantOnly, type }) => constantOnly || /_duration/.test(String(type))
  );
}

/**
 * Determines if date literals should be suggested.
 * Only for date parameters in WHERE/EVAL commands, excluding full-text search functions.
 */
function shouldAddDateLiterals(
  paramDefinitions: ParamDefinition[],
  commandName: string,
  functionName: string
): boolean {
  const hasDateParam = paramDefinitions.some(({ type }) => type === 'date');
  const isNotFullTextSearch = !FULL_TEXT_SEARCH_FUNCTIONS.includes(functionName);

  return (
    hasDateParam &&
    (isCommand(commandName, 'where') || isCommand(commandName, 'eval')) &&
    isNotFullTextSearch
  );
}

/**
 * Computes the suggestion configuration based on parameter definitions.
 * - acceptedTypes: which data types to suggest
 * - shouldAddComma: whether to append comma to suggestions
 * - allowFieldsAndFunctions: whether to suggest fields and functions (vs only literals)
 */
function computeSuggestionConfig(
  functionParamContext: NonNullable<ExpressionContext['options']['functionParameterContext']>,
  paramDefinitions: ParamDefinition[],
  functionDefinition: FunctionDef,
  isCursorFollowedByComma: boolean
) {
  const nonConstantParams = paramDefinitions.filter(({ constantOnly }) => !constantOnly);

  // Special cases: CASE function or boolean condition parameters
  const isCase = isFunction(functionDefinition.name, 'case');

  const isCaseWithEmptyParams = isCase && paramDefinitions.length === 0;
  const isBooleanCondition =
    isCase || paramDefinitions.some(({ type, name }) => type === 'boolean' && name === 'condition');

  // Determine accepted types based on parameter constraints
  let acceptedTypes: FunctionParameterType[];

  if (nonConstantParams.length > 0 || isCaseWithEmptyParams) {
    acceptedTypes =
      isBooleanCondition || isCaseWithEmptyParams
        ? ['any']
        : ensureKeywordAndText(nonConstantParams.map(({ type }) => type));
  } else if (paramDefinitions.length > 0) {
    acceptedTypes = ensureKeywordAndText(paramDefinitions.map(({ type }) => type));
  } else {
    acceptedTypes = ['any'];
  }

  // Determine if comma should be added after suggestions
  const hasMoreMandatoryArgs = Boolean(functionParamContext.hasMoreMandatoryArgs);
  const shouldAddComma =
    hasMoreMandatoryArgs &&
    functionDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !isCursorFollowedByComma &&
    !isBooleanCondition &&
    !isCaseWithEmptyParams;

  // Determine if fields/functions should be suggested (vs only literals)
  let allowFieldsAndFunctions =
    nonConstantParams.length > 0 || paramDefinitions.length === 0 || isCaseWithEmptyParams;

  // BUCKET special case: allow fields even with constant params
  if (!allowFieldsAndFunctions && isFunction(functionDefinition.name, 'bucket')) {
    allowFieldsAndFunctions = true;
  }

  return { acceptedTypes, shouldAddComma, allowFieldsAndFunctions };
}
