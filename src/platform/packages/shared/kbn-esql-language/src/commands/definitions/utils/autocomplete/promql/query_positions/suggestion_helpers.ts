/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQL_NUMBER_TYPES,
  ESQL_STRING_TYPES,
  type PromQLFunctionParamType,
} from '../../../../types';
import type { ICommandContext, ISuggestionItem } from '../../../../../registry/types';
import { commaCompleteItem } from '../../../../../registry/complete_items';
import { withAutoSuggest } from '../../helpers';
import { SuggestionCategory } from '../../../../../../language/autocomplete/utils';
import { suggestFunctions } from './functions';
import { suggestGrouping } from './grouping';

let commaWithAutoSuggest: ISuggestionItem | undefined;

/** Builds field/function suggestions for vector-like argument contexts. */
export function buildVectorSuggestions(
  columns: ICommandContext['columns'] | undefined,
  signatureTypes: PromQLFunctionParamType[],
  wrap: boolean
): ISuggestionItem[] {
  const metricTypes = getMetricTypesForSignature(signatureTypes);
  const functionSuggestions = suggestFunctions(signatureTypes);

  return [
    ...buildFieldSuggestions(columns, metricTypes, wrap ? 'wrap' : 'plain'),
    ...wrapFunctionSuggestions(wrap, functionSuggestions),
  ];
}

/** Suggests tokens immediately after a complete query expression. */
export function buildNextActionsSuggestion(input: {
  columns: ICommandContext['columns'] | undefined;
  shouldWrap: boolean;
  preGroupedAgg?: string;
  isAfterAggregationName: boolean;
  canAddGrouping: boolean;
}): ISuggestionItem[] {
  const { columns, shouldWrap, preGroupedAgg, isAfterAggregationName, canAddGrouping } = input;

  return suggestGrouping({
    columns,
    shouldWrap,
    preGroupedAgg,
    isAfterAggregationName,
    canAddGrouping,
    includePipe: true,
    buildVectorSuggestions,
  });
}

export function buildFieldSuggestions(
  columns: ICommandContext['columns'] | undefined,
  types: readonly string[] | undefined,
  wrap: 'wrap' | 'plain'
): ISuggestionItem[] {
  if (!columns) {
    return [];
  }

  return Array.from(columns.values())
    .filter(({ userDefined, type }) => !userDefined && (!types || types.includes(type)))
    .map(({ name, type }) => {
      const text = wrap === 'wrap' ? `(${name})` : `${name} `;

      return withAutoSuggest({
        label: name,
        text,
        kind: 'Field',
        detail: type,
        category: SuggestionCategory.FIELD,
      });
    });
}

/** Returns a cached comma suggestion wrapped with autosuggest metadata. */
export const buildCommaWithAutoSuggest = (): ISuggestionItem => {
  if (!commaWithAutoSuggest) {
    commaWithAutoSuggest = withAutoSuggest({ ...commaCompleteItem, text: ', ' });
  }

  return commaWithAutoSuggest;
};

function getMetricTypesForSignature(signatureTypes: PromQLFunctionParamType[]): readonly string[] {
  if (!signatureTypes.length) {
    return ESQL_NUMBER_TYPES;
  }

  const types = signatureTypes.flatMap((paramType) =>
    paramType === 'string' ? ESQL_STRING_TYPES : ESQL_NUMBER_TYPES
  );

  return Array.from(new Set(types));
}

/** Wraps suggestions in parentheses when a grouped expression is required. */
function wrapFunctionSuggestions(
  wrap: boolean,
  suggestions: ISuggestionItem[] = suggestFunctions()
): ISuggestionItem[] {
  if (!wrap) {
    return suggestions;
  }

  return suggestions.map(({ text: originalText, ...rest }) => {
    const hasCursorPlaceholder = originalText.includes('$0');
    const text = hasCursorPlaceholder ? `(${originalText})` : `(${originalText.trimEnd()} $0) `;

    return { ...rest, text };
  });
}
