/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
import dateMath from '@kbn/datemath';

import { DataPublicPluginStart, getEsQueryConfig } from '@kbn/data-plugin/public';
import { buildEsQuery } from '@kbn/es-query';
import { memoize } from 'lodash';
import { ControlGroupApi } from '../../control_group/types';
import { ControlStateManager } from '../../types';
import { OptionsListComponentState, OptionsListControlApi } from './types';

export function fetchAndValidate$({
  api,
  services,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews'> & {
    dataControlFetch$: ControlGroupApi['dataControlFetch$'];
    loadingSuggestions$: BehaviorSubject<boolean>;
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
      | 'searchString'
      | 'runPastTimeout'
      | 'sort'
      | 'searchTechnique'
      | 'selectedOptions'
      | 'requestSize'
    >
  >;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  let prevRequestAbortController: AbortController | undefined;
  const searchStringDebounced = stateManager.searchString.pipe(debounceTime(100));

  return combineLatest([
    api.dataViews,
    api.dataControlFetch$,
    stateManager.fieldName,
    searchStringDebounced,
    stateManager.sort,
    stateManager.searchTechnique,
    stateManager.requestSize,
  ]).pipe(
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
          dataControlFetchContext,
          fieldName,
          searchString,
          sort,
          searchTechnique,
          requestSize,
        ],
        runPastTimeout,
        selectedOptions,
      ]) => {
        api.loadingSuggestions$.next(true);
        const dataView = dataViews?.[0];
        const dataViewField =
          dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;
        if (!dataView || !dataViewField) {
          return { suggestions: [] };
        }

        const abortController = new AbortController();
        prevRequestAbortController = abortController;

        /** Fetch the suggestions list + perform validation */
        const request = {
          sort,
          size: requestSize,
          field: dataViewField.toSpec(),
          query: dataControlFetchContext.query,
          filters: dataControlFetchContext.unifiedSearchFilters,
          dataView,
          timeRange: dataControlFetchContext.timeRange,
          searchTechnique,
          runPastTimeout,
          selectedOptions,
          allowExpensiveQueries: true,
          searchString,
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
