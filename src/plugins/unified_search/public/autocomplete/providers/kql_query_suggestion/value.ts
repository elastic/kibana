/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flatten } from 'lodash';
import type { CoreSetup } from '@kbn/core/public';
import type { IFieldType, IIndexPattern } from '@kbn/data-plugin/public';
import { escapeQuotes } from './lib/escape_kuery';
import type { KqlQuerySuggestionProvider } from './types';
import type { UnifiedSearchPublicPluginStart } from '../../../types';
import { type QuerySuggestion, QuerySuggestionTypes } from '../query_suggestion_provider';

const wrapAsSuggestions = (start: number, end: number, query: string, values: string[]) =>
  values
    .filter((value) => value.toLowerCase().includes(query.toLowerCase()))
    .map((value) => ({
      type: QuerySuggestionTypes.Value,
      text: `${value} `,
      start,
      end,
    }));

export const setupGetValueSuggestions: KqlQuerySuggestionProvider = (
  core: CoreSetup<object, UnifiedSearchPublicPluginStart>
) => {
  const autoCompleteServicePromise = core
    .getStartServices()
    .then(([_, __, dataStart]) => dataStart.autocomplete);
  return async (
    { indexPatterns: dataViews, boolFilter, useTimeRange, signal, method },
    { start, end, prefix, suffix, fieldName, nestedPath }
  ): Promise<QuerySuggestion[]> => {
    const fullFieldName = nestedPath ? `${nestedPath}.${fieldName}` : fieldName;

    const dataViewFieldEntries: Array<[IIndexPattern, IFieldType]> = [];
    dataViews.forEach((dataView) => {
      dataView.fields
        .filter((field) => field.name === fullFieldName)
        .forEach((field) => dataViewFieldEntries.push([dataView, field]));
    });

    const query = `${prefix}${suffix}`.trim();
    const { getValueSuggestions } = await autoCompleteServicePromise;

    const data = await Promise.all(
      dataViewFieldEntries.map(([indexPattern, field]) =>
        getValueSuggestions({
          indexPattern,
          field,
          query,
          boolFilter,
          useTimeRange,
          signal,
          method,
        }).then((valueSuggestions) => {
          const quotedValues = valueSuggestions.map((value) =>
            typeof value === 'string' ? `"${escapeQuotes(value)}"` : `${value}`
          );

          return wrapAsSuggestions(start, end, query, quotedValues);
        })
      )
    );

    return flatten(data);
  };
};
