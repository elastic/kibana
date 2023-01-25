/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface OccurrencesRange {
  from: string;
  to: string;
}

export interface Result {
  range: OccurrencesRange | null | undefined;
  refetch: () => Promise<OccurrencesRange | null | undefined>;
}

export const useFetchOccurrencesRange = (params: Params): Result => {
  const data = params.services.data;
  const uiSettings = params.services.uiSettings;
  const [range, setRange] = useState<OccurrencesRange | null | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchOccurrences = useCallback(
    async (dataView?: DataView, query?: Query | AggregateQuery, filters?: Filter[]) => {
      let occurrencesRange = null;
      if (!dataView?.timeFieldName || !query || !mountedRef.current) {
        return null;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const dslQuery = buildEsQuery(
          dataView,
          query ?? [],
          filters ?? [],
          getEsQueryConfig(uiSettings)
        );
        occurrencesRange = await fetchDocumentsTimeRange({
          data,
          dataView,
          dslQuery,
          abortSignal: abortControllerRef.current?.signal,
        });
      } catch (error) {
        //
      }

      if (mountedRef.current) {
        setRange(occurrencesRange);
      }

      return occurrencesRange;
    },
    [abortControllerRef, setRange, mountedRef, data, uiSettings]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [abortControllerRef, mountedRef]);

  useEffect(() => {
    fetchOccurrences(params.dataView, params.query, params.filters);
  }, [fetchOccurrences, params.query, params.filters, params.dataView]);

  return {
    range,
    refetch: () => fetchOccurrences(params.dataView, params.query, params.filters),
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
}): Promise<OccurrencesRange | null> {
  if (!dataView?.timeFieldName) {
    return null;
  }

  const result = await lastValueFrom(
    data.search.search(
      {
        params: {
          index: dataView.title,
          size: 0,
          body: {
            query: dslQuery ?? { match_all: {} },
            aggs: {
              earliest_timestamp: {
                min: {
                  field: dataView.timeFieldName,
                },
              },
              latest_timestamp: {
                max: {
                  field: dataView.timeFieldName,
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

  const earliestTimestamp = (
    result.rawResponse?.aggregations?.earliest_timestamp as AggregationsSingleMetricAggregateBase
  )?.value_as_string;
  const latestTimestamp = (
    result.rawResponse?.aggregations?.latest_timestamp as AggregationsSingleMetricAggregateBase
  )?.value_as_string;

  return earliestTimestamp && latestTimestamp
    ? { from: earliestTimestamp, to: latestTimestamp }
    : null;
}
