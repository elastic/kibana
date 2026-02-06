/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexAutocompleteItem } from '@kbn/esql-types';
import type { ESQLAstAllCommands, ESQLAstPromqlCommand } from '../../../types';
import { specialIndicesToSuggestions, sourceExists } from '../../definitions/utils/sources';
import { getFragmentData } from '../../definitions/utils/autocomplete/helpers';
import { getDateLiterals } from '../../definitions/utils/literals';
import {
  getPromqlFunctionSuggestions,
  getPromqlFunctionSuggestionsForReturnTypes,
  getPromqlParamTypesForFunction,
} from '../../definitions/utils/promql';
import { getFunctionParamIndexAtCursor } from './utils';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
import { SuggestionCategory } from '../../../shared/sorting';
import {
  ESQL_NUMBER_TYPES,
  ESQL_STRING_TYPES,
  type PromQLFunctionParamType,
} from '../../definitions/types';
import {
  assignCompletionItem,
  buildAddValuePlaceholder,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  getPromqlParamKeySuggestions,
  pipeCompleteItem,
  promqlByCompleteItem,
  valuePlaceholderConstant,
} from '../complete_items';
import {
  areRequiredPromqlParamsPresent,
  getPromqlParam,
  getUsedPromqlParamNames,
  isAfterCustomColumnAssignment,
  PromqlParamValueType,
  getPosition,
  getIndexAssignmentContext,
  isParamValueComplete,
  isAtValidColumnSuggestionPosition,
  resolveFunctionAtCursor,
} from './utils';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const commandStart = command.location.min; // Don't assume 0; PROMQL can start in a subquery in the future.
  const innerCommandText = innerText.substring(commandStart);
  // We can't rely on command.location.max: it can stop at a mis-parsed last param, so we'd either
  // truncate or include the wrong text. The first pipe is the only stable delimiter here for now.
  const pipeIndex = query.indexOf('|', commandStart);
  const commandText = query.substring(commandStart, pipeIndex === -1 ? query.length : pipeIndex);
  const position = getPosition(innerText, command, commandText);
  const needsWrappedQuery = isAfterCustomColumnAssignment(innerCommandText);
  switch (position.type) {
    case 'after_command': {
      const usedParams = getUsedPromqlParamNames(commandText);
      const availableParamSuggestions = getPromqlParamKeySuggestions().filter(
        (suggestion) => !usedParams.has(suggestion.label)
      );

      const canSuggestColumn =
        areRequiredPromqlParamsPresent(usedParams) &&
        isAtValidColumnSuggestionPosition(commandText, cursorPosition - commandStart);
      const columnSuggestion = canSuggestColumn
        ? getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
        : undefined;

      const baseSuggestions = [
        ...availableParamSuggestions,
        ...(columnSuggestion ? [columnSuggestion] : []),
        ...(canSuggestColumn ? suggestMetrics(context, needsWrappedQuery, ESQL_NUMBER_TYPES) : []),
        ...(canSuggestColumn ? wrapFunctionSuggestions(needsWrappedQuery) : []),
      ];

      const indexSuggestions = suggestForIndexAssignment(
        innerCommandText,
        commandStart,
        context?.timeSeriesSources,
        [commaCompleteItem, ...baseSuggestions]
      );

      return indexSuggestions ?? baseSuggestions;
    }

    case 'after_param_keyword':
      return [assignCompletionItem];

    case 'after_param_equals':
      if (isParamValueComplete(commandText, cursorPosition - commandStart, position.currentParam)) {
        return [];
      }

      return suggestParamValues(position.currentParam, context);

    case 'inside_grouping':
      return suggestLabels(context);

    case 'inside_query':
      return [];

    case 'after_open_paren':
    case 'inside_function_args': {
      const promqlCommand = command as ESQLAstPromqlCommand;

      const { functionNode, fallback } = resolveFunctionAtCursor(
        promqlCommand,
        commandText,
        cursorPosition
      );
      const functionName = functionNode?.name ?? fallback?.name;
      const astParamIndex = functionNode
        ? getFunctionParamIndexAtCursor(promqlCommand, commandText, cursorPosition, functionNode)
        : 0;
      const paramIndex =
        fallback && fallback.name === functionName && fallback.paramIndex > astParamIndex
          ? fallback.paramIndex
          : astParamIndex;

      const signatureTypes = getPromqlParamTypesForFunction(functionName, paramIndex);
      const { types, useRangeVector } = getMetricSuggestionConfig(functionName, signatureTypes);

      const expectsOnlyScalar = isScalarOnlyParam(signatureTypes);
      const scalarValues = expectsOnlyScalar ? [buildAddValuePlaceholder('number')] : [];

      const metrics = expectsOnlyScalar
        ? []
        : suggestMetrics(context, needsWrappedQuery, types, useRangeVector);

      const functions = expectsOnlyScalar
        ? []
        : wrapFunctionSuggestions(
            needsWrappedQuery,
            getPromqlFunctionSuggestionsForReturnTypes(signatureTypes)
          );

      return [...scalarValues, ...metrics, ...functions];
    }

    case 'after_complete_expression':
      // Future: suggest binary operators (+, -, *, /, etc.)
      return [];

    case 'before_grouping':
      return [promqlByCompleteItem];

    case 'after_query': {
      const suggestions: ISuggestionItem[] = [pipeCompleteItem];

      if (position.canAddGrouping) {
        suggestions.unshift(promqlByCompleteItem);
      }

      return suggestions;
    }

    default:
      return [];
  }
}

/* Handles suggestions when cursor is inside "index=..." assignment context. */
/*
 * PROMQL index= is a param string (not a source arg like FROM/TS), so we can't reuse
 * the standard source-arg parsing. We inspect the raw assignment text to determine
 * whether to suggest indices, commas, or the next params.
 */
function suggestForIndexAssignment(
  commandText: string,
  commandStart: number,
  sources: IndexAutocompleteItem[] | undefined,
  onComplete: ISuggestionItem[]
): ISuggestionItem[] | undefined {
  const indexContext = getIndexAssignmentContext(commandText);
  if (!indexContext) {
    return undefined;
  }

  const availableSources = sources ?? [];
  const { valueText, valueStart } = indexContext;
  const valueTrimmed = valueText.trimEnd();

  if (valueTrimmed.endsWith(',')) {
    const filteredSources = filterAlreadyUsedSources(availableSources, valueText);
    return filteredSources.length ? buildSourceSuggestions(filteredSources) : [];
  }

  if (/\s$/.test(valueText) && valueTrimmed.length > 0) {
    return onComplete;
  }

  if (!availableSources.length) {
    return [];
  }

  const { fragment, rangeToReplace } = getFragmentData(valueText);
  const absoluteRange = fragment
    ? {
        start: commandStart + valueStart + rangeToReplace.start,
        end: commandStart + valueStart + rangeToReplace.end,
      }
    : undefined;

  const sourceNames = new Set(availableSources.map(({ name }) => name));
  if (fragment && sourceExists(fragment, sourceNames)) {
    return onComplete;
  }

  return buildSourceSuggestions(availableSources, fragment, absoluteRange);
}

/*
 * Filters out indices already present in the comma-separated value text.
 * PROMQL stores "index=logs-*,metrics-*" as one string, not separate args:
 * params.entries: [{ key: "index", value: "logs-*, metrics-*" }] vs
 * args: [{ type: "source", name: "logs-*" }, { type: "source", name: "metrics-*" }]
 */
function filterAlreadyUsedSources(
  sources: IndexAutocompleteItem[],
  valueText: string
): IndexAutocompleteItem[] {
  const alreadyUsed = valueText
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.startsWith('"') && entry.endsWith('"') ? entry.slice(1, -1) : entry));

  if (!alreadyUsed.length) {
    return sources;
  }

  return sources.filter(({ name }) => !alreadyUsed.includes(name));
}

/* Converts index metadata to suggestion items with optional fragment filtering. */
function buildSourceSuggestions(
  sources: IndexAutocompleteItem[],
  fragment?: string,
  rangeToReplace?: { start: number; end: number }
): ISuggestionItem[] {
  return specialIndicesToSuggestions(sources).map((suggestion) => ({
    ...suggestion,
    ...(fragment ? { filterText: fragment } : {}),
    ...(rangeToReplace ? { rangeToReplace } : {}),
  }));
}

/* Returns value suggestions based on the param type (sources, dates, or static values). */
function suggestParamValues(
  param: string | undefined,
  context?: ICommandContext
): ISuggestionItem[] {
  if (!param) {
    return [];
  }

  const definition = getPromqlParam(param);
  if (!definition) {
    return [];
  }

  const { valueType } = definition;

  if (valueType === PromqlParamValueType.TimeseriesSources) {
    const sources = context?.timeSeriesSources;
    return sources ? specialIndicesToSuggestions(sources) : [];
  }

  if (valueType === PromqlParamValueType.DateLiterals) {
    return getDateLiterals();
  }

  if (param === 'step') {
    return [
      {
        ...valuePlaceholderConstant,
        label: 'Insert duration',
        text: '"${0:5m}"',
        detail: 'Use units like s, m, h, d',
      },
    ];
  }

  return [valuePlaceholderConstant];
}

// ============================================================================
// Field Suggestions
// ============================================================================

/* Wraps function suggestions in parentheses when needed for column assignment syntax. */
function wrapFunctionSuggestions(
  wrap: boolean,
  suggestions: ISuggestionItem[] = getPromqlFunctionSuggestions()
): ISuggestionItem[] {
  if (!wrap) {
    return suggestions;
  }

  return suggestions.map((suggestion) => ({
    ...suggestion,
    text: `(${suggestion.text})`,
  }));
}

/* Converts PromQL metric fields from context into autocomplete suggestions. */
function suggestMetrics(
  context: ICommandContext | undefined,
  wrap: boolean | undefined,
  types: readonly string[],
  useRangeVector?: boolean
): ISuggestionItem[] {
  return buildFieldSuggestions(context, types, wrap ? 'wrap' : 'plain', useRangeVector);
}

/* Converts label field types into autocomplete suggestions. */
function suggestLabels(context?: ICommandContext): ISuggestionItem[] {
  return buildFieldSuggestions(context, ESQL_STRING_TYPES, 'plain');
}

/** Formats metric suggestion text, adding a range selector when needed. */
function buildMetricSuggestionText(name: string, useRangeVector: boolean): string {
  return useRangeVector ? `${name}[\${0:5m}]` : name;
}

function buildFieldSuggestions(
  context: ICommandContext | undefined,
  types: readonly string[],
  wrap: 'wrap' | 'plain',
  useRangeVector: boolean = false
): ISuggestionItem[] {
  if (!context?.columns) {
    return [];
  }

  return Array.from(context.columns.values())
    .filter((column) => !column.userDefined && types.includes(column.type))
    .map((column) => {
      const metricText = buildMetricSuggestionText(column.name, useRangeVector);

      return {
        label: column.name,
        text: wrap === 'wrap' ? `(${metricText})` : metricText,
        asSnippet: useRangeVector,
        kind: 'Field',
        detail: column.type,
        category: SuggestionCategory.FIELD,
      };
    });
}

// ============================================================================
// Function Argument Configuration
// ============================================================================

function isScalarOnlyParam(types: PromQLFunctionParamType[]): boolean {
  return types.length > 0 && types.every((type) => type === 'scalar');
}

/* PromQL scalars and vector samples are float64 (no ints); we treat them as numeric ESQL types for suggestions. */
function getEsqlTypesForPromqlParam(paramType: PromQLFunctionParamType): readonly string[] {
  return paramType === 'string' ? ESQL_STRING_TYPES : ESQL_NUMBER_TYPES;
}

/** Derives metric suggestion types and range-vector formatting from function signatures. */
function getMetricSuggestionConfig(
  name: string | undefined,
  signatureTypes: PromQLFunctionParamType[]
): { types: readonly string[]; useRangeVector: boolean } {
  const expectsRangeVector = signatureTypes.includes('range_vector');
  const expectsInstantVector = signatureTypes.includes('instant_vector');

  if (!signatureTypes.length) {
    return {
      types: ESQL_NUMBER_TYPES,
      useRangeVector: false,
    };
  }

  const types = signatureTypes.flatMap(getEsqlTypesForPromqlParam);
  const uniqueTypes = Array.from(new Set(types));
  const baseTypes = uniqueTypes.length ? uniqueTypes : ESQL_NUMBER_TYPES;

  return {
    types: baseTypes,
    useRangeVector: expectsRangeVector && !expectsInstantVector,
  };
}
