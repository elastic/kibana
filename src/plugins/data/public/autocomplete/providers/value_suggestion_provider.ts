/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
