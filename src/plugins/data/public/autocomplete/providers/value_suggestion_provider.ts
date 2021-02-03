/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dateMath from '@elastic/datemath';
import { memoize } from 'lodash';
import { CoreSetup } from 'src/core/public';
import { IIndexPattern, IFieldType, UI_SETTINGS, buildQueryFromFilters } from '../../../common';
import { TimefilterSetup } from '../../query';

function resolver(title: string, field: IFieldType, query: string, filters: any[]) {
  // Only cache results for a minute
  const ttl = Math.floor(Date.now() / 1000 / 60);
  return [ttl, query, title, field.name, JSON.stringify(filters)].join('|');
}

export type ValueSuggestionsGetFn = (args: ValueSuggestionsGetFnArgs) => Promise<any[]>;

interface ValueSuggestionsGetFnArgs {
  indexPattern: IIndexPattern;
  field: IFieldType;
  query: string;
  useTimeRange?: boolean;
  boolFilter?: any[];
  signal?: AbortSignal;
}

const getAutocompleteTimefilter = (
  { timefilter }: TimefilterSetup,
  indexPattern: IIndexPattern
) => {
  const timeRange = timefilter.getTime();

  // Use a rounded timerange so that memoizing works properly
  const roundedTimerange = {
    from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
    to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
  };
  return timefilter.createFilter(indexPattern, roundedTimerange);
};

export const getEmptyValueSuggestions = (() => Promise.resolve([])) as ValueSuggestionsGetFn;

export const setupValueSuggestionProvider = (
  core: CoreSetup,
  { timefilter }: { timefilter: TimefilterSetup }
): ValueSuggestionsGetFn => {
  const requestSuggestions = memoize(
    (index: string, field: IFieldType, query: string, filters: any = [], signal?: AbortSignal) =>
      core.http.fetch(`/api/kibana/suggestions/values/${index}`, {
        method: 'POST',
        body: JSON.stringify({ query, field: field.name, filters }),
        signal,
      }),
    resolver
  );

  return async ({
    indexPattern,
    field,
    query,
    useTimeRange,
    boolFilter,
    signal,
  }: ValueSuggestionsGetFnArgs): Promise<any[]> => {
    const shouldSuggestValues = core!.uiSettings.get<boolean>(
      UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES
    );
    useTimeRange =
      useTimeRange ?? core!.uiSettings.get<boolean>(UI_SETTINGS.AUTOCOMPLETE_USE_TIMERANGE);
    const { title } = indexPattern;

    if (field.type === 'boolean') {
      return [true, false];
    } else if (!shouldSuggestValues || !field.aggregatable || field.type !== 'string') {
      return [];
    }

    const timeFilter = useTimeRange
      ? getAutocompleteTimefilter(timefilter, indexPattern)
      : undefined;
    const filterQuery = timeFilter ? buildQueryFromFilters([timeFilter], indexPattern).filter : [];
    const filters = [...(boolFilter ? boolFilter : []), ...filterQuery];
    return await requestSuggestions(title, field, query, filters, signal);
  };
};
