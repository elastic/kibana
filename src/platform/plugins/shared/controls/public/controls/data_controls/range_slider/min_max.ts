/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type {
  FetchContext,
  PublishesDataSources,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { combineLatest, lastValueFrom, switchMap, tap } from 'rxjs';
import { max, min } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import { dataService } from '../../../services/kibana_services';
import { buildESQLPreFilter, getFetchContextFilters, getFetchContextTimeRange } from '../utils';
import type { ValuesSourceFetchPlan } from '../types';
import { getESQLSingleColumnValues } from '../../../../common/options_list';
import { getControlsTimezone } from '../../utils';

export function minMax$({
  controlFetch$,
  dataSources$,
  fieldName$,
  useGlobalFilters$,
  valuesSourceFetchPlan$,
  setIsLoading,
}: {
  controlFetch$: Observable<FetchContext>;
  dataSources$: PublishesDataSources['dataSources$'];
  fieldName$: PublishingSubject<string | undefined>;
  useGlobalFilters$: PublishingSubject<boolean | undefined>;
  valuesSourceFetchPlan$: PublishingSubject<ValuesSourceFetchPlan | undefined>;
  setIsLoading: (isLoading: boolean) => void;
}): {
  minMax$: Observable<{ error?: Error; min: number | undefined; max: number | undefined }>;
  cancelRequests: () => void;
} {
  let prevRequestAbortController: AbortController | undefined;

  const observable = combineLatest([
    controlFetch$,
    dataSources$,
    fieldName$,
    useGlobalFilters$,
    valuesSourceFetchPlan$,
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
        dataSources,
        fieldName,
        useGlobalFilters,
        valuesSourceFetchPlan,
      ]) => {
        const dataSource = dataSources?.[0];
        const field = dataSource && fieldName ? dataSource.getFieldByName(fieldName) : undefined;
        if (!dataSource || !field || !valuesSourceFetchPlan) {
          return { max: undefined, min: undefined };
        }

        const timeRange = getFetchContextTimeRange(controlFetchContext, useGlobalFilters);

        try {
          setIsLoading(true);
          const abortController = new AbortController();
          prevRequestAbortController = abortController;
          return valuesSourceFetchPlan.fetchMode === 'esql'
            ? await getEsqlMinMax({
                abortSignal: abortController.signal,
                esqlQuery: valuesSourceFetchPlan.query,
                dataSource,
                fetchContext: controlFetchContext,
                useGlobalFilters,
                timeRange,
              })
            : await getDslMinMax({
                abortSignal: abortController.signal,
                dataView: valuesSourceFetchPlan.dataView,
                field,
                query: isOfAggregateQueryType(controlFetchContext.query)
                  ? undefined
                  : controlFetchContext.query,
                timeRange,
                filters: getFetchContextFilters(controlFetchContext, useGlobalFilters),
              });
        } catch (error) {
          return { error, max: undefined, min: undefined };
        }
      }
    ),
    tap(() => {
      setIsLoading(false);
    })
  );

  return {
    minMax$: observable,
    cancelRequests: () => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    },
  };
}

export async function getEsqlMinMax({
  abortSignal,
  esqlQuery,
  dataSource,
  fetchContext,
  useGlobalFilters,
  timeRange,
}: {
  abortSignal: AbortSignal;
  esqlQuery?: string;
  dataSource: FilterableSource;
  fetchContext: FetchContext;
  useGlobalFilters: boolean | undefined;
  timeRange?: TimeRange;
}): Promise<{ min: number | undefined; max: number | undefined }> {
  // An ES|QL control without a query yet has no values to fetch
  if (!esqlQuery) return { min: undefined, max: undefined };

  const result = await getESQLSingleColumnValues({
    query: esqlQuery,
    timeRange,
    // Pre-filter the ES|QL pipeline by the dashboard's fetch context, so it mirrors how
    // field-based controls inherit the filter bar.
    filter: buildESQLPreFilter({
      fetchContext,
      useGlobalFilters,
      dataSource,
      timeRange,
      esqlQuery,
    }),
    signal: abortSignal,
    search: dataService.search.search,
    esqlVariables: fetchContext.esqlVariables ?? [],
    timezone: getControlsTimezone(),
  });
  if (getESQLSingleColumnValues.isNumericResult(result)) {
    return { min: min(result.values), max: max(result.values) };
  }
  const error = getESQLSingleColumnValues.isSuccess(result)
    ? new Error('Range slider values query returned a non-numeric field')
    : result.errors[0];
  throw error;
}

export async function getDslMinMax({
  abortSignal,
  dataView,
  field,
  filters,
  query,
  timeRange,
}: {
  abortSignal: AbortSignal;
  dataView: DataView;
  field: FilterableField;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}): Promise<{ min: number | undefined; max: number | undefined }> {
  const searchSource = await dataService.search.searchSource.create();
  searchSource.setField('size', 0);
  searchSource.setField('index', dataView);

  const allFilters = filters ? [...filters] : [];
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

  const aggBody: any = {};
  if (field.scripted) {
    aggBody.script = {
      source: field.script,
      lang: field.lang,
    };
  } else {
    aggBody.field = field.name;
  }

  const aggs = {
    maxAgg: {
      max: aggBody,
    },
    minAgg: {
      min: aggBody,
    },
  };
  searchSource.setField('aggs', aggs);

  const resp = await lastValueFrom(searchSource.fetch$({ abortSignal }));
  return {
    min:
      (resp.rawResponse?.aggregations?.minAgg as estypes.AggregationsSingleMetricAggregateBase)
        ?.value ?? undefined,
    max:
      (resp.rawResponse?.aggregations?.maxAgg as estypes.AggregationsSingleMetricAggregateBase)
        ?.value ?? undefined,
  };
}
