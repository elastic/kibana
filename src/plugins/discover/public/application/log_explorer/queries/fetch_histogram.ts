/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { forkJoin, Observable } from 'rxjs';
import { createUnsubscriptionAbortSignal } from '../hooks/use_observable';
import { SortCriteria } from '../types';
import { copyWithCommonParameters } from './common';
import { normalizeSortCriteriaForDataView } from '../utils/sort_criteria';
import { LogExplorerBreakdownField } from '../types';

export interface FetchHistogramParameters {
  sortCriteria: SortCriteria;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  breakdownField?: LogExplorerBreakdownField;
}

export const fetchHistogram =
  ({
    dataView,
    query: {
      timefilter: { timefilter },
    },
    searchSource,
  }: {
    dataView: DataView;
    query: QueryStart;
    searchSource: ISearchSource;
  }) =>
  ({
    filters,
    query,
    sortCriteria,
    timeRange,
    breakdownField,
  }: FetchHistogramParameters): Observable<{
    histogramResponse: IEsSearchResponse;
  }> => {
    const timeRangeFilter = timefilter.createFilter(dataView, timeRange);

    const commonSearchSource = copyWithCommonParameters({
      filters,
      query,
      timeRangeFilter,
    })(searchSource);

    const histogramSearchSource = applyHistogramParameters({
      dataView,
      sortCriteria,
      breakdownField,
    })(commonSearchSource.createCopy());

    const {
      abortSignal: fetchHistgramAbortSignal,
      abortOnUnsubscribe: abortOnFetchBeforeUnsubsribe,
    } = createUnsubscriptionAbortSignal();

    const histogramResponse$ = histogramSearchSource
      .fetch$({
        abortSignal: fetchHistgramAbortSignal,
      })
      .pipe(abortOnFetchBeforeUnsubsribe());

    return forkJoin({
      histogramResponse: histogramResponse$,
    });
  };

export const applyHistogramParameters =
  ({
    dataView,
    sortCriteria,
    breakdownField,
  }: {
    dataView: DataView;
    sortCriteria: SortCriteria;
    breakdownField?: LogExplorerBreakdownField;
  }) =>
  (searchSource: ISearchSource) =>
    searchSource
      .setField('sort', normalizeSortCriteriaForDataView(dataView)(sortCriteria))
      .setField('aggs', buildHistogramAggregations(dataView, breakdownField));

const buildHistogramAggregations = (
  dataView: DataView,
  breakdownField: LogExplorerBreakdownField = 'event.dataset' // TODO: Hook up to sidebar for real version
) => {
  return {
    breakdown_histogram: {
      auto_date_histogram: {
        buckets: 50,
        field: dataView.timeFieldName,
      },
      ...(breakdownField
        ? {
            aggs: {
              breakdown_terms: {
                terms: {
                  field: breakdownField,
                  size: 5,
                },
              },
            },
          }
        : {}),
    },
  };
};
