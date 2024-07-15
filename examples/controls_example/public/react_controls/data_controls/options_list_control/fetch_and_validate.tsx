/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  Observable,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import {
  OptionsListRequest,
  OptionsListSuccessResponse,
  type OptionsListResponse,
} from '@kbn/controls-plugin/common/options_list/types';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart, getEsQueryConfig } from '@kbn/data-plugin/public';
import dateMath from '@kbn/datemath';
import { buildEsQuery } from '@kbn/es-query';

import { ControlGroupApi } from '../../control_group/types';
import { ControlStateManager } from '../../types';
import { OptionsListComponentState, OptionsListControlApi } from './types';

export function fetchAndValidate$({
  api,
  services,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews' | 'fieldSpec'> & {
    dataControlFetch$: ControlGroupApi['dataControlFetch$'];
    loadingSuggestions$: BehaviorSubject<boolean>;
    allowExpensiveQueries$: BehaviorSubject<boolean>;
    debouncedSearchString: Observable<string>;
  };
  services: {
    http: CoreStart['http'];
    uiSettings: CoreStart['uiSettings'];
    data: DataPublicPluginStart;
  };
  stateManager: ControlStateManager<
    Pick<
      OptionsListComponentState,
      | 'fieldName'
      | 'runPastTimeout'
      | 'sort'
      | 'searchTechnique'
      | 'selectedOptions'
      | 'requestSize'
    >
  >;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  let prevRequestAbortController: AbortController | undefined;

  return combineLatest([
    api.dataViews,
    api.fieldSpec,
    api.dataControlFetch$,
    api.allowExpensiveQueries$,
    api.debouncedSearchString,
    stateManager.sort,
    stateManager.searchTechnique,
    stateManager.requestSize,
  ]).pipe(
    debounceTime(0),
    tap(() => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    }),
    withLatestFrom(stateManager.runPastTimeout, stateManager.selectedOptions),
    switchMap(
      async ([
        [
          dataViews,
          fieldSpec,
          dataControlFetchContext,
          allowExpensiveQueries,
          searchString,
          sort,
          searchTechnique,
          requestSize,
        ],
        runPastTimeout,
        selectedOptions,
      ]) => {
        const dataView = dataViews?.[0];
        if (!dataView || !fieldSpec) {
          return { suggestions: [] };
        }

        /** Fetch the suggestions list + perform validation */
        const request = {
          sort,
          size: requestSize,
          field: fieldSpec,
          query: dataControlFetchContext.query,
          filters: dataControlFetchContext.unifiedSearchFilters,
          dataView,
          timeRange: dataControlFetchContext.timeRange,
          searchTechnique,
          runPastTimeout,
          selectedOptions,
          allowExpensiveQueries,
          searchString,
        };

        try {
          const abortController = new AbortController();
          prevRequestAbortController = abortController;

          api.loadingSuggestions$.next(true);
          return await cachedOptionsListRequest(request, abortController.signal, services);
        } catch (error) {
          // Remove rejected results from memoize cache
          cachedOptionsListRequest.cache.delete(optionsListCacheResolver(request));
          return { error };
        }
      }
    ),
    tap(() => {
      api.loadingSuggestions$.next(false);
    })
  );
}

const optionsListCacheResolver = (request: OptionsListRequest) => {
  const {
    size,
    sort,
    query,
    filters,
    timeRange,
    searchString,
    runPastTimeout,
    selectedOptions,
    searchTechnique,
    field: { name: fieldName },
    dataView: { title: dataViewTitle },
  } = request;
  return [
    // round timeRange to the minute to avoid cache misses
    ...(timeRange
      ? JSON.stringify({
          from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
          to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
        })
      : []),
    Math.floor(Date.now() / 1000 / 60), // Only cache results for a minute in case data changes in ES index
    selectedOptions?.join(','),
    JSON.stringify(filters),
    JSON.stringify(query),
    JSON.stringify(sort),
    searchTechnique,
    runPastTimeout,
    dataViewTitle,
    searchString ?? '',
    fieldName,
    size,
  ].join('|');
};

const cachedOptionsListRequest = memoize(
  async (
    request: OptionsListRequest,
    abortSignal: AbortSignal,
    services: {
      http: CoreStart['http'];
      uiSettings: CoreStart['uiSettings'];
      data: DataPublicPluginStart;
    }
  ) => {
    const index = request.dataView.title;

    const timeService = services.data.query.timefilter.timefilter;
    const { query, filters, dataView, timeRange, field, ...passThroughProps } = request;
    const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
    const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
    const config = getEsQueryConfig(services.uiSettings);
    const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [], config)];

    const requestBody = {
      ...passThroughProps,
      filters: esFilters,
      fieldName: field.name,
      fieldSpec: field,
      runtimeFieldMap: dataView.toSpec().runtimeFieldMap,
    };

    return await services.http.fetch<OptionsListResponse>(
      `/internal/controls/optionsList/${index}`,
      {
        version: '1',
        body: JSON.stringify(requestBody),
        signal: abortSignal,
        method: 'POST',
      }
    );
  },
  optionsListCacheResolver
);
