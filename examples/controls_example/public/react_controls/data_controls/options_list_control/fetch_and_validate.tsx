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

import { ControlFetchContext } from '../../control_group/control_fetch';
import { ControlStateManager } from '../../types';
import { MIN_OPTIONS_LIST_REQUEST_SIZE } from './constants';
import { OptionsListComponentApi, OptionsListComponentState, OptionsListControlApi } from './types';
import { isValidSearch } from '../../../../common/options_list/is_valid_search';

export function fetchAndValidate$({
  api,
  services,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews' | 'fieldSpec' | 'setBlockingError'> &
    Pick<OptionsListComponentApi, 'loadMoreSubject' | 'allowExpensiveQueries$'> & {
      controlFetch$: Observable<ControlFetchContext>;
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  services: {
    http: CoreStart['http'];
    uiSettings: CoreStart['uiSettings'];
    data: DataPublicPluginStart;
  };
  stateManager: ControlStateManager<OptionsListComponentState>;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  let abortController: AbortController = new AbortController();

  return combineLatest([
    api.dataViews,
    api.fieldSpec,
    api.controlFetch$,
    api.allowExpensiveQueries$,
    api.debouncedSearchString,
    stateManager.sort,
    stateManager.searchTechnique,
    // cannot use requestSize directly, because we need to be able to reset the size to the default without refetching
    api.loadMoreSubject.pipe(debounceTime(100)), // debounce load more so "loading" state briefly shows
  ]).pipe(
    withLatestFrom(
      stateManager.requestSize,
      stateManager.runPastTimeout,
      stateManager.selectedOptions
    ),
    switchMap(
      async ([
        [
          dataViews,
          fieldSpec,
          controlFetchContext,
          allowExpensiveQueries,
          searchString,
          sort,
          searchTechnique,
        ],
        requestSize,
        runPastTimeout,
        selectedOptions,
      ]) => {
        const dataView = dataViews?.[0];
        if (
          !dataView ||
          !fieldSpec ||
          !isValidSearch({ searchString, fieldType: fieldSpec.type, searchTechnique })
        ) {
          return { suggestions: [] };
        }

        /** Abort any in-progress requests */
        abortController.abort();
        const newAbortController = new AbortController();
        abortController = newAbortController;

        /** Fetch the suggestions list + perform validation */
        api.loadingSuggestions$.next(true);

        const request = {
          sort,
          dataView,
          searchString,
          runPastTimeout,
          searchTechnique,
          selectedOptions,
          field: fieldSpec,
          size: requestSize,
          allowExpensiveQueries,
          ...controlFetchContext,
        };

        try {
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
