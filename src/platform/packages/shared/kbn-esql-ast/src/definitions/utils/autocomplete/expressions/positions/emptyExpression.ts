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
import {
  matchesSpecialFunction,
  shouldAddCommaAfterParam,
  getColumnsByTypeFromCtx,
  getLicenseCheckerFromCtx,
  getCommandNameFromCtx,
  isCursorFollowedByCommaFromCtx,
} from '../utils';
import { hasBooleanConditionParam, getAcceptedTypesForParamContext } from '../operators/utils';
import type { ExpressionContext } from '../types';
import { ensureKeywordAndText } from '../../functions';
import {
  getControlSuggestion,
  getVariablePrefix,
  getFunctionsSuggestions,
  getLiteralsSuggestions,
  getFieldsSuggestions,
} from '../../helpers';
import { buildValueDefinitions } from '../../../values';
import { getCompatibleLiterals } from '../../../literals';
import { FunctionDefinitionTypes } from '../../../../types';
import type { FunctionParameterType } from '../../../../types';
import {
  type ISuggestionItem,
  type GetColumnsByTypeFn,
} from '../../../../../commands_registry/types';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../../../constants';
import { allStarConstant } from '../../../../../..';

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

/** Handles suggestions when starting a new expression (empty position) */
export async function suggestForEmptyExpression(
  ctx: ExpressionContext
): Promise<ISuggestionItem[]> {
  const { options } = ctx;
  const functionParamContext = options.functionParameterContext;

  if (functionParamContext) {
    return handleFunctionParameterContext(functionParamContext, ctx);
  }

  return handleDefaultContext(ctx);
}

/** Handles suggestions when cursor is inside a function parameter (empty position) */
async function handleFunctionParameterContext(
  functionParamContext: NonNullable<ExpressionContext['options']['functionParameterContext']>,
  ctx: ExpressionContext
): Promise<ISuggestionItem[]> {
  const { location, context, options } = ctx;
  const { paramDefinitions, functionDefinition } = functionParamContext;
  const commandName = getCommandNameFromCtx(ctx);
  const ignoredColumns = options.ignoredColumnsForEmptyExpression || [];
  const isCursorFollowedByComma = isCursorFollowedByCommaFromCtx(ctx);

  if (!functionDefinition) {
    return [];
  }

  // Empty paramDefinitions = no valid signature for this position → return []
  // Example: FUNC(double, double, /) with only 1-2 param signatures → suggest nothing
  //
  // Exception (continue suggesting) only for variadic functions (CONCAT, COALESCE):
  // minParams defined, accepts unlimited params
  const isVariadicFunction = functionDefinition.signatures?.some((sig) => sig.minParams != null);

  if (paramDefinitions.length === 0 && !isVariadicFunction) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  // Suggest "*" for COUNT function (e.g., "COUNT(*)")
  if (
    functionParamContext &&
    functionParamContext.functionDefinition &&
    matchesSpecialFunction(functionParamContext.functionDefinition.name, 'count')
  ) {
    suggestions.push(allStarConstant);
  }

  // Suggest enum/predefined values if defined (e.g., DATE_DIFF units: "year", "month", "day")
  // This is exclusive - if enum values exist, return only those
  const enumItems = buildEnumValueSuggestions(
    paramDefinitions,
    functionDefinition,
    Boolean(functionParamContext.hasMoreMandatoryArgs),
    isCursorFollowedByComma
  );

  if (enumItems.length > 0) {
    return enumItems;
  }

  // Determine what types to suggest and whether to add comma after suggestion
  const { acceptedTypes, shouldAddComma, allowFieldsAndFunctions } = getParamSuggestionConfig(
    functionParamContext,
    paramDefinitions,
    functionDefinition,
    isCursorFollowedByComma
  );

  const hasMoreMandatoryArgs = Boolean(functionParamContext.hasMoreMandatoryArgs);

  // Suggest constant-only literals (e.g., "true", "false", "null", string/number literals)
  suggestions.push(
    ...buildConstantOnlyLiteralSuggestions(
      paramDefinitions,
      context,
      shouldAddComma,
      hasMoreMandatoryArgs
    )
  );

  // Suggest date literals (e.g., "now()", "1 hour", "2 days") except for FTS functions
  // Skip for BUCKET function in STATS BY context
  const isFtsFunction = FULL_TEXT_SEARCH_FUNCTIONS.includes(functionDefinition.name);
  const dateItems = isFtsFunction
    ? []
    : getLiteralsSuggestions(
        paramDefinitions.map(({ type }) => type),
        location,
        {
          includeDateLiterals: true,
          includeCompatibleLiterals: false,
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
        }
      );

  const isBucketInStatsBy =
    matchesSpecialFunction(functionDefinition.name, 'bucket') && commandName === 'stats';

  if (!isBucketInStatsBy) {
    suggestions.push(...dateItems);
  }

  // Suggest field/column names matching parameter types (e.g., "doubleField", "stringField")
  if (allowFieldsAndFunctions) {
    const getByType: GetColumnsByTypeFn = (types, ignored, opts) =>
      getColumnsByTypeFromCtx(ctx, types, ignored, opts);

    const fieldSuggestions = await getFieldsSuggestions(acceptedTypes, getByType, {
      ignoreColumns: ignoredColumns,
      addSpaceAfterField: shouldAddComma,
      openSuggestions: true,
      addComma: shouldAddComma,
      promoteToTop: true,
    });

    suggestions.push(...fieldSuggestions);
  }

  // Suggest functions matching parameter types (e.g., "ROUND($0)", "ABS($0)")
  // Skip if parameter only accepts fields (fieldsOnly constraint)
  if (allowFieldsAndFunctions && paramDefinitions.every(({ fieldsOnly }) => !fieldsOnly)) {
    suggestions.push(
      ...getFunctionsSuggestions({
        location,
        types: acceptedTypes,
        options: {
          ignored: functionParamContext.functionsToIgnore || [],
          addComma: shouldAddComma,
        },
        context,
        callbacks: { hasMinimumLicenseRequired: getLicenseCheckerFromCtx(ctx) },
      })
    );
  }

  return suggestions;
}

/** Handles suggestions for top-level expression (not inside a function parameter) */
async function handleDefaultContext(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { location, context, options } = ctx;
  const ignoredColumns = options.ignoredColumnsForEmptyExpression || [];
  const addSpaceAfterField = options.addSpaceAfterFirstField ?? true;
  const suggestFields = options.suggestFields ?? true;
  const suggestFunctions = options.suggestFunctions ?? true;
  const controlType = options.controlType ?? ESQLVariableType.FIELDS;

  const suggestions: ISuggestionItem[] = [];
  const acceptedTypes: FunctionParameterType[] = ['any'];

  // Suggest fields/columns (e.g., "field1", "field2")
  if (suggestFields) {
    const getByType: GetColumnsByTypeFn = (types, ignored, opt) =>
      getColumnsByTypeFromCtx(ctx, types, ignored, opt);

    const fieldSuggestions = await getFieldsSuggestions(acceptedTypes, getByType, {
      ignoreColumns: ignoredColumns,
      addSpaceAfterField,
      openSuggestions: true,
      promoteToTop: true,
      values: controlType === ESQLVariableType.VALUES,
    });
    suggestions.push(...fieldSuggestions);
  }

  // Suggest functions (e.g., "ROUND($0)", "ABS($0)")
  if (suggestFunctions) {
    suggestions.push(
      ...getFunctionsSuggestions({
        location,
        types: acceptedTypes,
        options: { ignored: [] },
        context,
        callbacks: { hasMinimumLicenseRequired: getLicenseCheckerFromCtx(ctx) },
      })
    );
  }

  // Suggest control variables (e.g., "?fieldName", "$valueName") if supported and not already present
  if (context?.supportsControls) {
    const hasControl = suggestions.some((suggestion) =>
      suggestion.command?.id?.includes('esql.control')
    );

    if (!hasControl) {
      const prefix = getVariablePrefix(controlType);
      const variableNames =
        context.variables
          ?.filter(({ type }) => type === controlType)
          .map(({ key }) => `${prefix}${key}`) ?? [];

      const controlSuggestions = getControlSuggestion(controlType, variableNames);
      suggestions.push(...controlSuggestions);
    }
  }

  return suggestions;
}

/** Collects all unique suggested values from parameter definitions (e.g., enums) */
function collectSuggestedValues(paramDefinitions: ParamDefinition[]): string[] {
  return uniq(
    paramDefinitions
      .map(({ suggestedValues }) => suggestedValues)
      .filter((values): values is string[] => Boolean(values))
      .flat()
  );
}

/** Filters parameters that only accept constant values (literals or duration types) */
function getConstantOnlyParams(paramDefinitions: ParamDefinition[]): ParamDefinition[] {
  return paramDefinitions.filter(
    ({ constantOnly, type }) => constantOnly || /_duration/.test(String(type))
  );
}

/** Derives suggestion configuration for next function parameter */
function getParamSuggestionConfig(
  functionParamContext: NonNullable<ExpressionContext['options']['functionParameterContext']>,
  paramDefinitions: ParamDefinition[],
  functionDefinition: FunctionDef,
  isCursorFollowedByComma: boolean
) {
  const nonConstantParams = paramDefinitions.filter(({ constantOnly }) => !constantOnly);
  const isBooleanCondition = hasBooleanConditionParam(functionDefinition.name, paramDefinitions);

  const acceptedTypes = getAcceptedTypesForParamContext(
    functionDefinition.name,
    paramDefinitions
  ) as FunctionParameterType[];

  const hasMoreMandatoryArgs = Boolean(functionParamContext.hasMoreMandatoryArgs);
  const shouldAddComma = shouldAddCommaAfterParam(
    hasMoreMandatoryArgs,
    functionDefinition.type as any,
    {
      isCursorFollowedByComma,
      isBooleanCondition,
    }
  );

  let allowFieldsAndFunctions = nonConstantParams.length > 0 || paramDefinitions.length === 0;

  if (!allowFieldsAndFunctions && matchesSpecialFunction(functionDefinition.name, 'bucket')) {
    allowFieldsAndFunctions = true;
  }

  return { acceptedTypes, shouldAddComma, allowFieldsAndFunctions };
}

/** Builds suggestions for enum/predefined values */
function buildEnumValueSuggestions(
  paramDefinitions: ParamDefinition[],
  functionDefinition: FunctionDef,
  hasMoreMandatoryArgs: boolean,
  isCursorFollowedByComma: boolean
): ISuggestionItem[] {
  const values = collectSuggestedValues(paramDefinitions);

  if (!values.length) {
    return [];
  }

  const isBooleanCondition = hasBooleanConditionParam(functionDefinition.name, paramDefinitions);
  const shouldAddComma =
    hasMoreMandatoryArgs &&
    functionDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !isCursorFollowedByComma &&
    !isBooleanCondition;

  return buildValueDefinitions(values, {
    addComma: shouldAddComma,
    advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
  });
}

/** Builds suggestions for constant-only literal parameters */
function buildConstantOnlyLiteralSuggestions(
  paramDefinitions: ParamDefinition[],
  context: ExpressionContext['context'],
  shouldAddComma: boolean,
  hasMoreMandatoryArgs: boolean
): ISuggestionItem[] {
  const constantOnlyParams = getConstantOnlyParams(paramDefinitions);
  if (!constantOnlyParams.length) {
    return [];
  }

  return getCompatibleLiterals(
    ensureKeywordAndText(constantOnlyParams.map(({ type }) => type)),
    {
      supportsControls: context?.supportsControls,
      addComma: shouldAddComma,
      advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
    },
    context?.variables
  );
}
