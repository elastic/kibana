/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assign } from 'xstate';
import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { catchError, last, map, Observable, of } from 'rxjs';
import { HistogramMachineContext, HistogramMachineEvent } from '../types';
import { fetchHistogram, FetchHistogramParameters } from '../../../queries/fetch_histogram';

export type LoadHistogramEvent =
  | {
      type: 'loadHistogramSucceeded';
      requestParameters: FetchHistogramParameters;
      histogramResponse: IEsSearchResponse;
    }
  | {
      type: 'loadHistogramFailed';
      error: unknown;
    };

export const loadHistogram = ({
  dataView,
  query: queryService,
  searchSource,
}: {
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchHistogram = fetchHistogram({
    dataView,
    query: queryService,
    searchSource,
  });

  return (context: HistogramMachineContext): Observable<LoadHistogramEvent> => {
    const { filters, query, timeRange } = context;

    const fetchHistogramRequestParameters: FetchHistogramParameters = {
      sortCriteria: [
        // TODO: don't hard-code this
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
      filters,
      query,
    };

    return boundFetchHistogram(fetchHistogramRequestParameters).pipe(
      last(),
      map(({ histogramResponse }) => {
        return {
          type: 'loadHistogramSucceeded' as const,
          requestParameters: fetchHistogramRequestParameters,
          histogramResponse,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadHistogramFailed' as const,
          requestParameters: fetchHistogramRequestParameters,
          error: err,
        });
      })
    );
  };
};

export const updateHistogram = assign(
  (context: HistogramMachineContext, event: HistogramMachineEvent) => {
    if (event.type !== 'loadHistogramSucceeded') {
      return context;
    }

    const { histogramResponse } = event;

    const breakdownBuckets =
      histogramResponse.rawResponse?.aggregations?.breakdown_histogram?.buckets;

    if (!breakdownBuckets) {
      return { ...context, histogram: { data: [] } };
    }

    const histogramData = breakdownBuckets.reduce((acc, bucket) => {
      const termsBuckets = bucket.breakdown_terms.buckets;

      const entry = {
        startTime: bucket.key_as_string,
        countByBreakdownCriterion: termsBuckets.reduce((termsAcc, termsBucket) => {
          termsAcc[termsBucket.key] = termsBucket.doc_count;
          return termsAcc;
        }, {}),
      };

      entry.countByBreakdownCriterion.Other =
        bucket.doc_count -
        Object.values(entry.countByBreakdownCriterion).reduce((acc, value) => acc + value, 0);

      acc.push(entry);

      return acc;
    }, []);

    return {
      ...context,
      histogram: histogramData,
    };
  }
);
