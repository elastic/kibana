/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup } from '@kbn/core/public';
import dateMath from '@kbn/datemath';
import { memoize } from 'lodash';
import { UI_SETTINGS, ValueSuggestionsMethod } from '@kbn/data-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterSetup } from '@kbn/data-plugin/public';
import type { AutocompleteUsageCollector } from '../collectors';

export type ValueSuggestionsGetFn = (args: ValueSuggestionsGetFnArgs) => Promise<any[]>;

interface ValueSuggestionsGetFnArgs {
  indexPattern: DataView;
  field: DataViewField;
  query: string;
  useTimeRange?: boolean;
  boolFilter?: any[];
  signal?: AbortSignal;
  method?: ValueSuggestionsMethod;
  querySuggestionKey?: 'rules' | 'cases' | 'alerts';
}

const getAutocompleteTimefilter = ({ timefilter }: TimefilterSetup, indexPattern: DataView) => {
  const timeRange = timefilter.getTime();

  // Use a rounded timerange so that memoizing works properly
  const roundedTimerange = {
    from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
    to: dateMath.parse(timeRange.to, { roundUp: true })!.endOf('minute').toISOString(),
  };
  return timefilter.createFilter(indexPattern, roundedTimerange);
};

export const getEmptyValueSuggestions = (() => Promise.resolve([])) as ValueSuggestionsGetFn;

export const setupValueSuggestionProvider = (
  core: CoreSetup,
  {
    timefilter,
    usageCollector,
  }: { timefilter: TimefilterSetup; usageCollector?: AutocompleteUsageCollector }
): ValueSuggestionsGetFn => {
  function resolver(title: string, field: DataViewField, query: string, filters: any[]) {
    // Only cache results for a minute
    const ttl = Math.floor(Date.now() / 1000 / 60);
    return [ttl, query, title, field.name, JSON.stringify(filters)].join('|');
  }

  const requestSuggestions = memoize(
    <T = unknown>(
      index: string,
      field: DataViewField,
      query: string,
      filters: any = [],
      signal?: AbortSignal,
      method: ValueSuggestionsMethod = core.uiSettings.get<ValueSuggestionsMethod>(
        UI_SETTINGS.AUTOCOMPLETE_VALUE_SUGGESTION_METHOD
      ),
      querySuggestionKey?: string
    ) => {
      usageCollector?.trackRequest();
      let path = `/internal/kibana/suggestions/values/${index}`;
      if (querySuggestionKey) {
        path = `/internal/${querySuggestionKey}/suggestions/values`;
      }
      return core.http
        .fetch<T>(path, {
          method: 'POST',
          body: JSON.stringify({
            query,
            field: field.name,
            fieldMeta: field.toSpec?.() ?? field,
            filters,
            ...(querySuggestionKey === undefined ? { method } : {}),
          }),
          signal,
          version: '1',
        })
        .then((r) => {
          usageCollector?.trackResult();
          return r;
        });
    },
    resolver
  );

  return async ({
    indexPattern,
    field,
    query,
    useTimeRange,
    boolFilter,
    signal,
    method,
    querySuggestionKey,
  }: ValueSuggestionsGetFnArgs): Promise<any[]> => {
    const shouldSuggestValues = core!.uiSettings.get<boolean>(
      UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES
    );
    useTimeRange =
      useTimeRange ?? core!.uiSettings.get<boolean>(UI_SETTINGS.AUTOCOMPLETE_USE_TIMERANGE);
    const { title } = indexPattern;

    const isVersionFieldType = field.type === 'string' && field.esTypes?.includes('version');

    if (field.type === 'boolean') {
      return [true, false];
    } else if (
      !shouldSuggestValues ||
      !field.aggregatable ||
      (field.type !== 'string' && field.type !== 'ip') ||
      isVersionFieldType // suggestions don't work for version fields
    ) {
      return [];
    }

    const timeFilter = useTimeRange
      ? getAutocompleteTimefilter(timefilter, indexPattern)
      : undefined;
    const { buildQueryFromFilters } = await import('@kbn/es-query');
    const filterQuery = timeFilter ? buildQueryFromFilters([timeFilter], indexPattern).filter : [];
    const filters = [...(boolFilter ? boolFilter : []), ...filterQuery];
    try {
      usageCollector?.trackCall();
      return await requestSuggestions(
        title,
        field,
        query,
        filters,
        signal,
        method,
        querySuggestionKey
      );
    } catch (e) {
      if (!signal?.aborted) {
        usageCollector?.trackError();
      }
      // Remove rejected results from memoize cache
      requestSuggestions.cache.delete(resolver(title, field, query, filters));
      return [];
    }
  };
};
