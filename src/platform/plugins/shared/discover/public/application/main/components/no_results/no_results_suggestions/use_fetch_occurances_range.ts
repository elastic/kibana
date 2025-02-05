/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { AggregationsSingleMetricAggregateBase } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

export interface Params {
  dataView?: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  services: {
    data: DataPublicPluginStart;
    uiSettings: IUiSettingsClient;
  };
}

export enum TimeRangeExtendingStatus {
  initial = 'initial',
  loading = 'loading',
  succeedWithResults = 'succeedWithResults',
  succeedWithoutResults = 'succeedWithoutResults',
  failed = 'failed',
  timedOut = 'timedOut',
}

export interface OccurrencesRange {
  from: string;
  to: string;
}

interface OccurrencesRangeFetchResult {
  status: TimeRangeExtendingStatus;
  range?: OccurrencesRange;
}

export interface Result {
  fetch: () => Promise<OccurrencesRangeFetchResult>;
}

export const useFetchOccurrencesRange = (params: Params): Result => {
  const data = params.services.data;
  const uiSettings = params.services.uiSettings;
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchOccurrences = useCallback(
    async (dataView?: DataView, query?: Query | AggregateQuery, filters?: Filter[]) => {
      let occurrencesRangeResult = { status: TimeRangeExtendingStatus.failed };

      if (dataView?.isTimeBased() && query && mountedRef.current) {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        try {
          const dslQuery = buildEsQuery(
            dataView,
            query ?? [],
            filters ?? [],
            getEsQueryConfig(uiSettings)
          );
          occurrencesRangeResult = await fetchDocumentsTimeRange({
            data,
            dataView,
            dslQuery,
            abortSignal: abortControllerRef.current?.signal,
          });
        } catch (error) {
          if (error.name !== 'AbortError') {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }
      }

      return occurrencesRangeResult;
    },
    [abortControllerRef, mountedRef, data, uiSettings]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [abortControllerRef, mountedRef]);

  return {
    fetch: () => fetchOccurrences(params.dataView, params.query, params.filters),
  };
};

async function fetchDocumentsTimeRange({
  data,
  dataView,
  dslQuery,
  abortSignal,
}: {
  data: DataPublicPluginStart;
  dataView: DataView;
  dslQuery?: object;
  abortSignal?: AbortSignal;
}): Promise<OccurrencesRangeFetchResult> {
  if (!dataView?.timeFieldName) {
    return { status: TimeRangeExtendingStatus.failed };
  }

  const result = await lastValueFrom(
    data.search.search(
      {
        params: {
          index: dataView.getIndexPattern(),
          size: 0,
          track_total_hits: false,
          body: {
            timeout: '20s',
            query: dslQuery ?? { match_all: {} },
            aggs: {
              earliest_timestamp: {
                min: {
                  field: dataView.timeFieldName,
                  format: 'strict_date_optional_time',
                },
              },
              latest_timestamp: {
                max: {
                  field: dataView.timeFieldName,
                  format: 'strict_date_optional_time',
                },
              },
            },
          },
        },
      },
      {
        abortSignal,
      }
    )
  );

  if (result.rawResponse?.timed_out) {
    return { status: TimeRangeExtendingStatus.timedOut };
  }

  if (
    result.rawResponse?._clusters?.total !== result.rawResponse?._clusters?.successful ||
    result.rawResponse?._shards?.total !== result.rawResponse?._shards?.successful
  ) {
    return { status: TimeRangeExtendingStatus.failed };
  }

  const earliestTimestamp = (
    result.rawResponse?.aggregations?.earliest_timestamp as AggregationsSingleMetricAggregateBase
  )?.value_as_string;
  const latestTimestamp = (
    result.rawResponse?.aggregations?.latest_timestamp as AggregationsSingleMetricAggregateBase
  )?.value_as_string;

  return earliestTimestamp && latestTimestamp
    ? {
        status: TimeRangeExtendingStatus.succeedWithResults,
        range: { from: earliestTimestamp, to: latestTimestamp },
      }
    : { status: TimeRangeExtendingStatus.succeedWithoutResults };
}
