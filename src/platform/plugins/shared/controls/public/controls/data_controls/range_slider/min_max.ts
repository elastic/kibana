/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type {
  FetchContext,
  PublishesDataViews,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { combineLatest, lastValueFrom, switchMap, tap } from 'rxjs';
import { dataService } from '../../../services/kibana_services';
import { getFetchContextFilters } from '../utils';

export function minMax$({
  controlFetch$,
  dataViews$,
  fieldName$,
  useGlobalFilters$,
  setIsLoading,
}: {
  controlFetch$: Observable<FetchContext>;
  dataViews$: PublishesDataViews['dataViews$'];
  fieldName$: PublishingSubject<string>;
  useGlobalFilters$: PublishingSubject<boolean | undefined>;
  setIsLoading: (isLoading: boolean) => void;
}) {
  let prevRequestAbortController: AbortController | undefined;
  return combineLatest([controlFetch$, dataViews$, fieldName$, useGlobalFilters$]).pipe(
    tap(() => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    }),
    switchMap(async ([controlFetchContext, dataViews, fieldName, useGlobalFilters]) => {
      const dataView = dataViews?.[0];
      const dataViewField = dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;
      if (!dataView || !dataViewField) {
        return { max: undefined, min: undefined };
      }
      controlFetchContext.filters = getFetchContextFilters(controlFetchContext, useGlobalFilters);

      try {
        setIsLoading(true);
        const abortController = new AbortController();
        prevRequestAbortController = abortController;
        return await getMinMax({
          abortSignal: abortController.signal,
          dataView,
          field: dataViewField,
          ...controlFetchContext,
        });
      } catch (error) {
        return { error, max: undefined, min: undefined };
      }
    }),
    tap(() => {
      setIsLoading(false);
    })
  );
}

export async function getMinMax({
  abortSignal,
  dataView,
  field,
  filters,
  query,
  timeRange,
}: {
  abortSignal: AbortSignal;
  dataView: DataView;
  field: DataViewField;
  filters?: Filter[];
  query?: Query | AggregateQuery;
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
