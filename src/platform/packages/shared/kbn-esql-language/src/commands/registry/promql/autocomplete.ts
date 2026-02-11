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
import { getFragmentData } from '../../definitions/utils/autocomplete/helpers';
import { getDateLiterals } from '../../definitions/utils/literals';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
import {
  assignCompletionItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  getPromqlParamKeySuggestions,
  pipeCompleteItem,
  valuePlaceholderConstant,
} from '../complete_items';
import {
  areRequiredPromqlParamsPresent,
  getPromqlParam,
  getUsedPromqlParamNames,
  PromqlParamValueType,
} from './utils';
import {
  getPosition,
  getIndexAssignmentContext,
  isParamValueComplete,
  isAtValidColumnSuggestionPosition,
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
  const position = getPosition(innerText, command);

  switch (position.type) {
    case 'after_command': {
      // Scan full PROMQL command for used params.
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

      const onComplete = [
        commaCompleteItem,
        ...availableParamSuggestions,
        ...(columnSuggestion ? [columnSuggestion] : []),
      ];

      const indexSuggestions = suggestForIndexAssignment(
        innerCommandText,
        commandStart,
        context?.timeSeriesSources,
        onComplete
      );

      if (indexSuggestions) {
        return indexSuggestions;
      }

      return [...availableParamSuggestions, ...(columnSuggestion ? [columnSuggestion] : [])];
    }

    case 'after_param_keyword':
      return [assignCompletionItem];

    case 'after_param_equals':
      if (isParamValueComplete(commandText, cursorPosition - commandStart, position.currentParam)) {
        return [];
      }
      return suggestParamValues(position.currentParam, context);

    case 'inside_query':
      // TODO: Add PromQL autocomplete suggestions (functions, metrics, labels)
      return [];

    case 'after_query':
      return [pipeCompleteItem];

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
  const indexContext = getIndexAssignmentContext(commandText, 'index');
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
