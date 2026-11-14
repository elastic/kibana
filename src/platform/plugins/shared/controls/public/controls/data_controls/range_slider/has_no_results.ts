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
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { combineLatest, lastValueFrom, switchMap, tap } from 'rxjs';
import { dataService, dataViewsService } from '../../../services/kibana_services';
import { getESQLSingleColumnValues } from '../../../../common/options_list';
import { getControlsTimezone } from '../../utils';
import {
  buildESQLPreFilter,
  getEsqlSourceFieldQuery,
  getFetchContextFilters,
  getFetchContextTimeRange,
} from '../utils';
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
  ]).pipe(
    tap(() => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    }),
    switchMap(async ([controlFetchContext, rangeFilters, useGlobalFilters, ignoreValidations]) => {
      const dataSource = api.dataSources$?.value?.[0];
      const rangeFilter = rangeFilters?.[0];
      if (!dataSource || !rangeFilter || ignoreValidations) {
        return false;
      }
      const fieldName = api.fieldName$.value;
      const field = fieldName ? dataSource.getFieldByName(fieldName) : undefined;

      try {
        setIsLoading(true);
        const abortController = new AbortController();
        prevRequestAbortController = abortController;
        return await hasNoResults({
          abortSignal: abortController.signal,
          dataSource,
          esql: getEsqlSourceFieldQuery(dataSource, field),
          rangeFilter,
          ...controlFetchContext,
          timeRange: getFetchContextTimeRange(controlFetchContext, useGlobalFilters),
          filters: getFetchContextFilters(controlFetchContext, useGlobalFilters),
        });
      } catch (error) {
        // Ignore error, validation is not required for control to function properly
        return false;
      }
    }),
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

export async function hasNoResults({
  abortSignal,
  dataSource,
  esql,
  filters,
  query,
  rangeFilter,
  timeRange,
}: {
  abortSignal: AbortSignal;
  dataSource: FilterableSource;
  /** The query that populates the control, for an ES|QL source */
  esql?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  rangeFilter: Filter;
  timeRange?: TimeRange;
}): Promise<boolean> {
  if (esql) {
    // The values of the query that are in the range: there are none when the range has no results
    const result = await getESQLSingleColumnValues({
      query: `${esql}\n| LIMIT 1`,
      filter: buildESQLPreFilter({
        fetchContext: { query, filters: [...(filters ?? []), rangeFilter] },
        useGlobalFilters: true,
        dataSource,
        timeRange,
        esqlQuery: esql,
      }),
      signal: abortSignal,
      search: dataService.search.search,
      esqlVariables: [],
      timezone: getControlsTimezone(),
    });
    if (!getESQLSingleColumnValues.isSuccess(result)) {
      throw result.errors[0];
    }
    return getESQLSingleColumnValues.hasNoResults(result);
  }

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

  const resp = await lastValueFrom(
    searchSource.fetch$({
      abortSignal,
      legacyHitsTotal: false,
    })
  );
  const count = (resp?.rawResponse?.hits?.total as estypes.SearchTotalHits)?.value ?? 0;
  return count === 0;
}
