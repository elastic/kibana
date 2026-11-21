/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FilterableSource } from '@kbn/data-source';
import type { AggregateQuery, Filter, ProjectRouting, Query, TimeRange } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { combineLatest, lastValueFrom, switchMap, tap } from 'rxjs';
import { dataService, dataViewsService } from '../../../services/kibana_services';
import { getESQLSingleColumnValues } from '../../../../common/options_list';
import { getControlsTimezone } from '../../utils';
import { buildESQLPreFilter, getFetchContextFilters, getFetchContextTimeRange } from '../utils';
import type { DataControlStateManager } from '../data_control_manager';

export function hasNoResults$({
  api,
  controlFetch$,
  setIsLoading,
}: {
  api: DataControlStateManager['api'];
  controlFetch$: Observable<FetchContext>;
  setIsLoading: (isLoading: boolean) => void;
}): {
  hasNoResults$: Observable<boolean>;
  cancelRequests: () => void;
} {
  let prevRequestAbortController: AbortController | undefined;

  const observable = combineLatest([
    controlFetch$,
    api.appliedFilters$,
    api.useGlobalFilters$,
    api.ignoreValidations$,
    api.valuesSourceFetchPlan$,
  ]).pipe(
    tap(() => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    }),
    switchMap(
      async ([
        controlFetchContext,
        rangeFilters,
        useGlobalFilters,
        ignoreValidations,
        valuesSourceFetchPlan,
      ]) => {
        const dataSource = api.dataSources$?.value?.[0];
        const rangeFilter = rangeFilters?.[0];
        if (!dataSource || !rangeFilter || ignoreValidations || !valuesSourceFetchPlan) {
          return false;
        }
        const timeRange = getFetchContextTimeRange(controlFetchContext, useGlobalFilters);
        const filters = getFetchContextFilters(controlFetchContext, useGlobalFilters);

        try {
          setIsLoading(true);
          const abortController = new AbortController();
          prevRequestAbortController = abortController;
          return valuesSourceFetchPlan.fetchMode === 'esql'
            ? await hasNoEsqlResults({
                abortSignal: abortController.signal,
                dataSource,
                esqlQuery: valuesSourceFetchPlan.query,
                esqlVariables: controlFetchContext.esqlVariables,
                rangeFilter,
                query: controlFetchContext.query,
                timeRange,
                filters,
                searchSessionId: controlFetchContext.searchSessionId,
                projectRouting: controlFetchContext.projectRouting,
              })
            : await hasNoDslResults({
                abortSignal: abortController.signal,
                dataSource,
                rangeFilter,
                query: isOfAggregateQueryType(controlFetchContext.query)
                  ? undefined
                  : controlFetchContext.query,
                timeRange,
                filters,
                searchSessionId: controlFetchContext.searchSessionId,
                projectRouting: controlFetchContext.projectRouting,
              });
        } catch (error) {
          // Ignore error, validation is not required for control to function properly
          return false;
        }
      }
    ),
    tap(() => {
      setIsLoading(false);
    })
  );

  return {
    hasNoResults$: observable,
    cancelRequests: () => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    },
  };
}

export async function hasNoEsqlResults({
  abortSignal,
  dataSource,
  esqlQuery,
  esqlVariables,
  filters,
  query,
  rangeFilter,
  timeRange,
  searchSessionId,
  projectRouting,
}: {
  abortSignal: AbortSignal;
  dataSource: FilterableSource;
  esqlQuery?: string;
  esqlVariables?: ESQLControlVariable[];
  filters?: Filter[];
  query?: Query | AggregateQuery;
  rangeFilter: Filter;
  timeRange?: TimeRange;
  searchSessionId?: string;
  projectRouting?: ProjectRouting;
}): Promise<boolean> {
  // An ES|QL control without a query yet has nothing to validate
  if (!esqlQuery) return false;

  // The values of the query that are in the range: there are none when the range has no results
  const result = await getESQLSingleColumnValues({
    query: `${esqlQuery}\n| LIMIT 1`,
    timeRange: timeRange && dataService.search.session.resolveTimeRange(timeRange),
    sessionId: searchSessionId,
    projectRouting,
    filter: buildESQLPreFilter({
      fetchContext: { query, filters: [...(filters ?? []), rangeFilter] },
      useGlobalFilters: true,
      dataSource,
      timeRange,
      esqlQuery,
    }),
    signal: abortSignal,
    search: dataService.search.search,
    esqlVariables: esqlVariables ?? [],
    timezone: getControlsTimezone(),
  });
  if (!getESQLSingleColumnValues.isSuccess(result)) {
    throw result.errors[0];
  }
  return getESQLSingleColumnValues.hasNoResults(result);
}

export async function hasNoDslResults({
  abortSignal,
  dataSource,
  filters,
  query,
  rangeFilter,
  timeRange,
  searchSessionId,
  projectRouting,
}: {
  abortSignal: AbortSignal;
  dataSource: FilterableSource;
  filters?: Filter[];
  query?: Query;
  rangeFilter: Filter;
  timeRange?: TimeRange;
  searchSessionId?: string;
  projectRouting?: ProjectRouting;
}): Promise<boolean> {
  const dataView = await dataViewsService.get(dataSource.id ?? '');

  const searchSource = await dataService.search.searchSource.create();
  searchSource.setField('size', 0);
  searchSource.setField('index', dataView);
  // Tracking total hits accurately has a performance cost
  // Setting 'trackTotalHits' to 1 since we just want to know
  // "has no results" or "has results" vs the actual count
  searchSource.setField('trackTotalHits', 1);

  const allFilters = filters ? [...filters] : [];
  allFilters.push(rangeFilter);
  if (timeRange) {
    const timeFilter = dataService.query.timefilter.timefilter.createFilter(dataView, timeRange);
    if (timeFilter) allFilters.push(timeFilter);
  }
  if (allFilters.length) {
    searchSource.setField('filter', allFilters);
  }

  if (query) {
    searchSource.setField('query', query);
  }

  // Pass projectRouting so switching projects doesn't reuse the previous project's cached results.
  const resp = await lastValueFrom(
    searchSource.fetch$({
      abortSignal,
      legacyHitsTotal: false,
      sessionId: searchSessionId,
      projectRouting,
    })
  );
  const count = (resp?.rawResponse?.hits?.total as estypes.SearchTotalHits)?.value ?? 0;
  return count === 0;
}
