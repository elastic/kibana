/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexAutocompleteItem } from '@kbn/esql-types';
import type { ESQLAstAllCommands } from '../../../types';
import { specialIndicesToSuggestions, sourceExists } from '../../definitions/utils/sources';
import { getFragmentData, withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { getDateLiterals } from '../../definitions/utils/literals';
import {
  getPromqlFunctionSuggestions,
  getPromqlLabelMatcherSuggestions,
  getPromqlOperatorSuggestions,
  getMetricTypesForSignature,
} from '../../definitions/utils/promql';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
import { ESQL_NUMBER_TYPES, ESQL_STRING_TYPES } from '../../definitions/types';
import {
  assignCompletionItem,
  buildAddValuePlaceholder,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  getPromqlParamKeySuggestions,
  pipeCompleteItem,
  promqlByCompleteItem,
  promqlLabelSelectorItem,
  promqlRangeSelectorItem,
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
} from './utils';
import { findPipeOutsideQuotes } from '../../definitions/utils/shared';
import { SuggestionCategory } from '../../../language/autocomplete/utils';

let commaWithAutoSuggest: ISuggestionItem | undefined;
const getCommaWithAutoSuggest = (): ISuggestionItem => {
  if (!commaWithAutoSuggest) {
    commaWithAutoSuggest = withAutoSuggest({ ...commaCompleteItem, text: ', ' });
  }

  return commaWithAutoSuggest;
};

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
  const cursorRelativeToCommand = cursorPosition - commandStart;
  // We can't rely on command.location.max: it can stop at a mis-parsed last param, so we'd either
  // truncate or include the wrong text. The first pipe is the only stable delimiter here for now.
  const pipeIndex = findPipeOutsideQuotes(query, commandStart);
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
        isAtValidColumnSuggestionPosition(commandText, cursorRelativeToCommand);
      const columnSuggestion = canSuggestColumn
        ? getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
        : undefined;

      const baseSuggestions = [
        ...availableParamSuggestions,
        ...(columnSuggestion ? [columnSuggestion] : []),
        ...(canSuggestColumn
          ? buildFieldSuggestions(context, ESQL_NUMBER_TYPES, needsWrappedQuery ? 'wrap' : 'plain')
          : []),
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
      if (isParamValueComplete(commandText, cursorRelativeToCommand, position.currentParam)) {
        return [];
      }

      return suggestParamValues(position.currentParam, context);

    case 'inside_grouping':
      return position.isCompleteLabel
        ? [getCommaWithAutoSuggest()]
        : buildFieldSuggestions(context, ESQL_STRING_TYPES, 'plain');

    case 'after_label_brace':
      return position.isCompleteLabel
        ? [getCommaWithAutoSuggest()]
        : buildFieldSuggestions(context, ESQL_STRING_TYPES, 'plain');
    case 'after_label_name':
      return getPromqlLabelMatcherSuggestions();
    case 'after_label_operator':
      return [valuePlaceholderConstant];

    case 'after_operator': {
      const signatureTypes = position.signatureTypes ?? [];
      const metricTypes = getMetricTypesForSignature(signatureTypes);
      const canSuggestScalar = signatureTypes.length === 0 || signatureTypes.includes('scalar');
      const functionSuggestions = getPromqlFunctionSuggestions(signatureTypes);

      return [
        ...buildFieldSuggestions(context, metricTypes, needsWrappedQuery ? 'wrap' : 'plain'),
        ...wrapFunctionSuggestions(needsWrappedQuery, functionSuggestions),
        ...(canSuggestScalar ? [buildAddValuePlaceholder('number')] : []),
      ];
    }

    case 'after_metric': {
      const metricSuggestions: ISuggestionItem[] = [promqlLabelSelectorItem];

      const expectsRangeVector = position.signatureTypes?.includes('range_vector');
      const hasDuration = position.selector?.duration;

      if (expectsRangeVector && !hasDuration) {
        metricSuggestions.push(promqlRangeSelectorItem);
      } else {
        metricSuggestions.push(...getPromqlOperatorSuggestions());
      }

      return metricSuggestions;
    }

    case 'after_label_selector': {
      const labelSelectorSuggestions: ISuggestionItem[] = [];

      const expectsRangeVector = position.signatureTypes?.includes('range_vector');
      const canSuggestRange = position.canSuggestRangeSelector;

      if (expectsRangeVector && canSuggestRange) {
        labelSelectorSuggestions.push(promqlRangeSelectorItem);
      } else {
        labelSelectorSuggestions.push(...getPromqlOperatorSuggestions());
      }

      return labelSelectorSuggestions;
    }

    case 'inside_query': {
      const insideQuerySuggestions: ISuggestionItem[] = [...getPromqlOperatorSuggestions()];

      if (position.canAddGrouping) {
        insideQuerySuggestions.push(promqlByCompleteItem);
      }

      return insideQuerySuggestions;
    }

    case 'after_complete_arg': {
      const expectsRangeVector = position.signatureTypes?.includes('range_vector');
      const completeArgSuggestions: ISuggestionItem[] = expectsRangeVector
        ? []
        : [...getPromqlOperatorSuggestions()];

      if (position.canSuggestCommaInFunctionArgs) {
        completeArgSuggestions.push(getCommaWithAutoSuggest());
      }

      return completeArgSuggestions;
    }

    case 'after_open_paren':
    case 'inside_function_args': {
      if (position.canSuggestCommaInFunctionArgs) {
        return [getCommaWithAutoSuggest()];
      }
      const signatureTypes = position.signatureTypes ?? [];
      const types = getMetricTypesForSignature(signatureTypes);

      const expectsOnlyScalar =
        signatureTypes.length > 0 && signatureTypes.every((type) => type === 'scalar');
      const scalarValues = expectsOnlyScalar ? [buildAddValuePlaceholder('number')] : [];

      const metrics = expectsOnlyScalar
        ? []
        : buildFieldSuggestions(context, types, needsWrappedQuery ? 'wrap' : 'plain');

      const functions = expectsOnlyScalar
        ? []
        : wrapFunctionSuggestions(needsWrappedQuery, getPromqlFunctionSuggestions(signatureTypes));

      return [...scalarValues, ...metrics, ...functions];
    }

    case 'after_query': {
      const suggestions: ISuggestionItem[] = [...getPromqlOperatorSuggestions(), pipeCompleteItem];

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

function buildFieldSuggestions(
  context: ICommandContext | undefined,
  types: readonly string[] | undefined,
  wrap: 'wrap' | 'plain'
): ISuggestionItem[] {
  if (!context?.columns) {
    return [];
  }

  return Array.from(context.columns.values())
    .filter((column) => !column.userDefined && (!types || types.includes(column.type)))
    .map((column) => {
      const text = wrap === 'wrap' ? `(${column.name})` : `${column.name} `;

      return withAutoSuggest({
        label: column.name,
        text,
        kind: 'Field',
        detail: column.type,
        category: SuggestionCategory.FIELD,
      });
    });
}
