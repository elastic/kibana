/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlTriggerSource, ESQLVariableType } from '@kbn/esql-types';
import { isEqual, uniq, uniqWith } from 'lodash';
import { matchesSpecialFunction } from '../utils';
import { shouldSuggestComma, type CommaContext } from '../comma_decision_engine';
import type { ExpressionContext } from '../types';
import { ensureKeywordAndText } from '../../functions';
import { SuggestionBuilder } from '../suggestion_builder';
import { SignatureAnalyzer } from '../signature_analyzer';
import { getControlSuggestion, getVariablePrefix } from '../../helpers';
import { buildValueDefinitions } from '../../../values';
import type {
  FunctionDefinition,
  FunctionParameter,
  FunctionParameterType,
  ParameterHint,
} from '../../../../types';
import { type ISuggestionItem } from '../../../../../registry/types';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../../../constants';
import {
  allStarConstant,
  valuePlaceholderConstant,
  defaultValuePlaceholderConstant,
  buildAddValuePlaceholder,
  findConstantPlaceholderType,
} from '../../../../../registry/complete_items';
import { parametersFromHintsResolvers } from '../../parameters_from_hints';

// functionDefinition is guaranteed by in_function.ts early return
type FunctionParamContext = NonNullable<ExpressionContext['options']['functionParameterContext']>;

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
  functionParamContext: FunctionParamContext,
  ctx: ExpressionContext
): Promise<ISuggestionItem[]> {
  const { paramDefinitions } = functionParamContext;
  const analyzer = SignatureAnalyzer.from(functionParamContext);

  // Early validation
  if (!analyzer) {
    return [];
  }

  // Empty paramDefinitions = no valid signature for this position → return []
  // Example: FUNC(double, double, /) with only 1-2 param signatures → suggest nothing
  //
  // Exception (continue suggesting) for:
  // - variadic functions (CONCAT, COALESCE): minParams defined, accepts unlimited params
  // - repeating signatures (CASE): accepts unlimited condition/value pairs
  if (paramDefinitions.length === 0 && !analyzer.isVariadic && !analyzer.hasRepeatingSignature) {
    return [];
  }

  // Try exclusive suggestions first (COUNT(*), enum values)
  const exclusiveSuggestions = tryExclusiveSuggestions(functionParamContext, ctx);

  if (exclusiveSuggestions.length > 0) {
    return exclusiveSuggestions;
  }

  // Build composite suggestions (literals + fields + functions)
  return buildCompositeSuggestions(functionParamContext, ctx, analyzer);
}

/** Try suggestions that are exclusive (if present, return only these) */
function tryExclusiveSuggestions(
  functionParamContext: FunctionParamContext,
  ctx: ExpressionContext
): ISuggestionItem[] {
  const { functionDefinition, paramDefinitions } = functionParamContext;
  const { options } = ctx;

  // Enum values are exclusive - if present, return only those
  const enumItems = buildEnumValueSuggestions(
    paramDefinitions,
    functionDefinition!,
    Boolean(functionParamContext.hasMoreMandatoryArgs),
    options.isCursorFollowedByComma ?? false
  );
  if (enumItems.length > 0) {
    return enumItems;
  }

  // Some parameters suggests special values that are deduced from the hints object provided by ES.
  const itemsFromHints = buildSuggestionsFromHints(paramDefinitions, ctx);
  if (itemsFromHints.length > 0) {
    return itemsFromHints;
  }

  return [];
}

/** Build composite suggestions: literals + fields + functions */
async function buildCompositeSuggestions(
  functionParamContext: FunctionParamContext,
  ctx: ExpressionContext,
  analyzer: SignatureAnalyzer
): Promise<ISuggestionItem[]> {
  const { functionDefinition } = functionParamContext;
  const { options } = ctx;

  // Determine configuration
  const config = getParamSuggestionConfig(
    functionParamContext,
    options.isCursorFollowedByComma ?? false,
    analyzer
  );

  const suggestions: ISuggestionItem[] = [];

  // Special case: COUNT function suggests "*" (e.g., "COUNT(*)")
  if (matchesSpecialFunction(functionDefinition!.name, 'count')) {
    suggestions.push(allStarConstant);
  }

  if (config.isAmbiguousPosition) {
    suggestions.push(defaultValuePlaceholderConstant);
  } else if (config.isRepeatingValuePosition) {
    suggestions.push(valuePlaceholderConstant);
  }

  // Add literal suggestions
  suggestions.push(...buildLiteralSuggestions(functionParamContext, ctx, config));

  // Add field and function suggestions
  suggestions.push(...(await buildFieldAndFunctionSuggestions(functionParamContext, ctx, config)));

  return suggestions;
}

/** Build all literal suggestions (constants + dates) */
function buildLiteralSuggestions(
  functionParamContext: FunctionParamContext,
  ctx: ExpressionContext,
  config: ReturnType<typeof getParamSuggestionConfig>
): ISuggestionItem[] {
  const { paramDefinitions, functionDefinition } = functionParamContext;
  const { command } = ctx;

  const hasMoreMandatoryArgs = Boolean(functionParamContext.hasMoreMandatoryArgs);
  const suggestions: ISuggestionItem[] = [];
  const hasConstantOnlyParams = paramDefinitions.some(({ constantOnly }) => constantOnly);

  // Constant-only literals (true, false, null, string/number literals)
  const constantOnlySuggestions = buildConstantOnlyLiteralSuggestions(
    paramDefinitions,
    ctx,
    config.shouldAddComma,
    hasMoreMandatoryArgs
  );
  suggestions.push(...constantOnlySuggestions);

  // Date literals (now(), 1 hour, 2 days, ?_tstart, ?_tend) - only add if not already added by constantOnly path
  // Skip for:
  // - FTS functions
  // - BUCKET first parameter (field) in STATS
  // - When constantOnly params exist (already added via getCompatibleLiterals)
  const isFtsFunction = FULL_TEXT_SEARCH_FUNCTIONS.includes(functionDefinition!.name);
  const isBucketFirstParam =
    matchesSpecialFunction(functionDefinition!.name, 'bucket') &&
    command.name === 'stats' &&
    (functionParamContext.currentParameterIndex ?? 0) === 0;

  if (!isFtsFunction && !isBucketFirstParam && !hasConstantOnlyParams) {
    const builder = new SuggestionBuilder(ctx);

    builder.addLiterals({
      types: paramDefinitions.map(({ type }) => type),
      includeDateLiterals: true,
      includeCompatibleLiterals: false,
      addComma: config.shouldAddComma,
      advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
    });

    suggestions.push(...builder.build());
  }

  return suggestions;
}

/** Build field and function suggestions using SuggestionBuilder */
async function buildFieldAndFunctionSuggestions(
  functionParamContext: FunctionParamContext,
  ctx: ExpressionContext,
  config: ReturnType<typeof getParamSuggestionConfig>
): Promise<ISuggestionItem[]> {
  const { paramDefinitions } = functionParamContext;
  const { options } = ctx;
  const ignoredColumns = options.ignoredColumnsForEmptyExpression || [];

  const builder = new SuggestionBuilder(ctx);

  // Suggest fields when:
  // - there is at least one non-constant parameter, OR
  // - param definitions are empty (variadic/unknown position, e.g., CONCAT third+ arg)

  const hasConstantOnlyParam = paramDefinitions.some(({ constantOnly }) => constantOnly);
  const hasFieldsOnlyParam = paramDefinitions.some(({ fieldsOnly }) => fieldsOnly);

  // constantOnly params require literal values, not fields
  // (variadic functions work correctly: empty paramDefinitions → hasConstantOnlyParam = false)
  if (!hasConstantOnlyParam) {
    const canBeMultiValue = paramDefinitions.some(
      (t) => t && (t.supportsMultiValues === true || t.name === 'values')
    );

    await builder.addFields({
      types: config.acceptedTypes,
      ignoredColumns,
      addComma: config.shouldAddComma,
      promoteToTop: true,
      canBeMultiValue,
    });
  }

  // constantOnly params require literal values, not function results
  if (!hasFieldsOnlyParam && !hasConstantOnlyParam) {
    builder.addFunctions({
      types: config.acceptedTypes,
      addComma: config.shouldAddComma,
      excludeParentFunctions: true,
    });
  }

  return builder.build();
}

/** Handles suggestions for top-level expression (not inside a function parameter) */
async function handleDefaultContext(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { context, options } = ctx;
  const ignoredColumns = options.ignoredColumnsForEmptyExpression || [];
  const addSpaceAfterField = options.addSpaceAfterFirstField ?? true;
  const suggestFields = options.suggestFields ?? true;
  const suggestFunctions = options.suggestFunctions ?? true;
  const controlType = options.controlType ?? ESQLVariableType.FIELDS;

  const suggestions: ISuggestionItem[] = [];
  const acceptedTypes: FunctionParameterType[] = ['any'];

  // Suggest fields/columns and functions using SuggestionBuilder
  if (suggestFields || suggestFunctions) {
    const builder = new SuggestionBuilder(ctx);

    if (suggestFields) {
      await builder.addFields({
        types: acceptedTypes,
        ignoredColumns,
        addSpaceAfterField,
        promoteToTop: true,
        ...(options.openSuggestions !== undefined && { openSuggestions: options.openSuggestions }),
      });
    }

    if (suggestFunctions) {
      builder.addFunctions({
        types: acceptedTypes,
      });
    }

    suggestions.push(...builder.build());
  }

  // Suggest control variables (e.g., "??fieldName", "?valueName") if supported and not already present
  const hasControl = suggestions.some((suggestion) =>
    suggestion.command?.id?.includes('esql.control')
  );

  if (!hasControl) {
    const prefix = getVariablePrefix(controlType);
    const variableNames =
      context?.variables
        ?.filter(({ type }) => type === controlType)
        .map(({ key }) => `${prefix}${key}`) ?? [];

    const controlSuggestions = getControlSuggestion(
      controlType,
      ControlTriggerSource.SMART_SUGGESTION,
      variableNames,
      Boolean(context?.supportsControls)
    );
    suggestions.push(...controlSuggestions);
  }

  return suggestions;
}

/** Collects all unique suggested values from parameter definitions (e.g., enums) */
function collectSuggestedValues(paramDefinitions: FunctionParameter[]): string[] {
  return uniq(
    paramDefinitions
      .map(({ suggestedValues }) => suggestedValues)
      .filter((values): values is string[] => Boolean(values))
      .flat()
  );
}

/** Filters parameters that only accept constant values (literals or duration types) */
function getConstantOnlyParams(paramDefinitions: FunctionParameter[]): FunctionParameter[] {
  return paramDefinitions.filter(
    ({ constantOnly, type }) => constantOnly || /_duration/.test(String(type))
  );
}

/** Derives suggestion configuration for next function parameter */
function getParamSuggestionConfig(
  functionParamContext: FunctionParamContext,
  isCursorFollowedByComma: boolean,
  analyzer: SignatureAnalyzer
) {
  const { functionDefinition } = functionParamContext;
  const acceptedTypes = analyzer.getAcceptedTypes() as FunctionParameterType[];

  const hasMoreMandatoryArgs = Boolean(functionParamContext.hasMoreMandatoryArgs);

  const commaContext: CommaContext = {
    position: 'empty_expression',
    hasMoreMandatoryArgs,
    functionType: functionDefinition!.type,
    isCursorFollowedByComma,
    functionSignatures: functionDefinition!.signatures,
  };

  const shouldAddComma = shouldSuggestComma(commaContext);

  return {
    acceptedTypes,
    shouldAddComma,
    isRepeatingValuePosition: analyzer.isRepeatingValuePosition,
    isAmbiguousPosition: analyzer.isAmbiguousPosition,
  };
}

/** Builds suggestions for enum/predefined values */
function buildEnumValueSuggestions(
  paramDefinitions: FunctionParameter[],
  functionDefinition: FunctionDefinition,
  hasMoreMandatoryArgs: boolean,
  isCursorFollowedByComma: boolean
): ISuggestionItem[] {
  const values = collectSuggestedValues(paramDefinitions);

  if (!values.length) {
    return [];
  }

  const commaContext: CommaContext = {
    position: 'enum_value',
    hasMoreMandatoryArgs,
    functionType: functionDefinition.type,
    isCursorFollowedByComma,
    functionSignatures: functionDefinition.signatures,
  };

  const shouldAddComma = shouldSuggestComma(commaContext);

  return buildValueDefinitions(values, {
    addComma: shouldAddComma,
    advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
  });
}

function buildSuggestionsFromHints(
  paramDefinitions: FunctionParameter[],
  ctx: ExpressionContext
): ISuggestionItem[] {
  // Keep the hints that are unique by entityType + constraints
  const hints: ParameterHint[] = uniqWith(
    paramDefinitions.flatMap(({ hint }) => hint ?? []),
    (a, b) => a.entityType === b.entityType && isEqual(a.constraints, b.constraints)
  );

  const results = hints.map(
    (hint) =>
      parametersFromHintsResolvers[hint.entityType]?.suggestionResolver?.(hint, ctx.context) ?? []
  );

  return results.flat();
}

/** Builds suggestions for constant-only literal parameters */
function buildConstantOnlyLiteralSuggestions(
  paramDefinitions: FunctionParameter[],
  ctx: ExpressionContext,
  shouldAddComma: boolean,
  hasMoreMandatoryArgs: boolean
): ISuggestionItem[] {
  const constantOnlyParams = getConstantOnlyParams(paramDefinitions);
  if (!constantOnlyParams.length) {
    return [];
  }

  const types = ensureKeywordAndText(constantOnlyParams.map(({ type }) => type));

  const builder = new SuggestionBuilder(ctx);

  builder.addLiterals({
    types,
    addComma: shouldAddComma,
    advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
    includeDateLiterals: false, // Date literals are added separately in buildLiteralSuggestions
    includeCompatibleLiterals: true,
  });

  builder.addFunctions({
    types,
    addComma: shouldAddComma,
    constantGeneratingOnly: true,
  });

  const suggestions = builder.build();

  // Add placeholder hint ONLY for explicit constantOnly parameters
  const hasExplicitConstantOnly = paramDefinitions.some(({ constantOnly }) => constantOnly);

  if (hasExplicitConstantOnly) {
    const placeholderType = findConstantPlaceholderType(types);

    if (placeholderType) {
      suggestions.push(buildAddValuePlaceholder(placeholderType));
    }
  }

  return suggestions;
}
