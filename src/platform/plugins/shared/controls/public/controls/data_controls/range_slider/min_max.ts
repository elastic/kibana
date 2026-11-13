/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type {
  AggregateQuery,
  BoolQuery,
  Filter,
  ProjectRouting,
  Query,
  TimeRange,
} from '@kbn/es-query';
import type {
  FetchContext,
  PublishesDataSources,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { combineLatest, lastValueFrom, switchMap, tap } from 'rxjs';
import { ControlValuesSource } from '@kbn/controls-constants';
import { max, min } from 'lodash';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { dataService, dataViewsService } from '../../../services/kibana_services';
import {
  buildESQLPreFilter,
  getFieldValuesQuery,
  getFetchContextFilters,
  getFetchContextTimeRange,
} from '../utils';
import { getESQLSingleColumnValues } from '../../../../common/options_list';
import { getControlsTimezone } from '../../utils';

export function minMax$({
  controlFetch$,
  dataSources$,
  fieldName$,
  useGlobalFilters$,
  esqlQuery$,
  valuesSource$,
  setIsLoading,
}: {
  controlFetch$: Observable<FetchContext>;
  dataSources$: PublishesDataSources['dataSources$'];
  fieldName$: PublishingSubject<string | undefined>;
  useGlobalFilters$: PublishingSubject<boolean | undefined>;
  esqlQuery$: PublishingSubject<string | undefined>;
  valuesSource$: PublishingSubject<ControlValuesSource | undefined>;
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
    esqlQuery$,
    valuesSource$,
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
        esqlQuery,
        valuesSource,
      ]) => {
        const dataSource = dataSources?.[0];
        const field = dataSource && fieldName ? dataSource.getFieldByName(fieldName) : undefined;
        if (!dataSource || !field) {
          return { max: undefined, min: undefined };
        }

        // The values of a field of an ES|QL source come from a query on its FROM target, as the
        // query that the user writes in the editor does.
        const esql =
          valuesSource === ControlValuesSource.ESQL
            ? esqlQuery
            : isEsqlFilterableSource(dataSource)
            ? getFieldValuesQuery(dataSource, field.name)
            : undefined;

        try {
          setIsLoading(true);
          const abortController = new AbortController();
          prevRequestAbortController = abortController;
          return await getMinMax({
            abortSignal: abortController.signal,
            dataSource,
            field,
            ...controlFetchContext,
            query: esql !== undefined ? { esql } : controlFetchContext.query,
            timeRange: getFetchContextTimeRange(controlFetchContext, useGlobalFilters),
            filters: getFetchContextFilters(controlFetchContext, useGlobalFilters),
            // Pre-filter the ES|QL pipeline by the dashboard's fetch context. Built only from
            // the *dashboard* query/filters (not the per-row `query` above which may carry the
            // ES|QL itself), so it mirrors how field-based controls inherit the filter bar.
            esqlPreFilter:
              esql !== undefined
                ? buildESQLPreFilter({
                    fetchContext: controlFetchContext,
                    useGlobalFilters,
                    dataSource,
                    timeRange: getFetchContextTimeRange(controlFetchContext, useGlobalFilters),
                    esqlQuery: esql,
                  })
                : undefined,
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

interface GetMinMaxParams {
  abortSignal: AbortSignal;
  dataSource: FilterableSource;
  field: FilterableField;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
  esqlVariables?: ESQLControlVariable[];
  esqlPreFilter?: { bool: BoolQuery };
  projectRouting?: ProjectRouting;
}

interface MinMax {
  min: number | undefined;
  max: number | undefined;
}

export async function getMinMax(params: GetMinMaxParams): Promise<MinMax> {
  const { query } = params;
  return query && 'esql' in query
    ? getMinMaxOfEsqlQuery(query.esql, params)
    : getMinMaxOfDataView(params);
}

async function getMinMaxOfEsqlQuery(
  esqlQuery: string,
  { abortSignal, timeRange, esqlVariables, esqlPreFilter, projectRouting }: GetMinMaxParams
): Promise<MinMax> {
  const result = await getESQLSingleColumnValues({
    query: esqlQuery,
    timeRange,
    filter: esqlPreFilter,
    signal: abortSignal,
    search: dataService.search.search,
    esqlVariables: esqlVariables ?? [],
    timezone: getControlsTimezone(),
    projectRouting,
  });
  if (getESQLSingleColumnValues.isNumericResult(result)) {
    return { min: min(result.values), max: max(result.values) };
  }
  throw getESQLSingleColumnValues.isSuccess(result)
    ? new Error('Range slider values query returned a non-numeric field')
    : result.errors[0];
}

async function getMinMaxOfDataView({
  abortSignal,
  dataSource,
  field,
  filters,
  query,
  timeRange,
}: GetMinMaxParams): Promise<MinMax> {
  const dataView = await dataViewsService.get(dataSource.id ?? '');

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
