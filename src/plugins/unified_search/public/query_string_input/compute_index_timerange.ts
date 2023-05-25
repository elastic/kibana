/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregationsSingleMetricAggregateBase } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildEsQuery } from '@kbn/es-query';

export interface Params {
  dataView?: DataView | string;
  query?: Query | AggregateQuery;
  services: {
    data: DataPublicPluginStart;
  };
  abortSignal: AbortSignal;
}

export interface OccurrencesRange {
  from: string;
  to: string;
}

export interface Result {
  range: OccurrencesRange | null | undefined;
  refetch: () => Promise<OccurrencesRange | null | undefined>;
}

export const computeTimeRange = async ({ dataView, query, services, abortSignal }: Params) => {
  if (
    typeof dataView !== 'string' &&
    dataView?.isTimeBased() &&
    query &&
    isOfAggregateQueryType(query)
  ) {
    try {
      const dslQuery = buildEsQuery(dataView, [], []);
      const occurrencesRange = await fetchDocumentsTimeRange({
        data: services.data,
        dataView,
        dslQuery,
        abortSignal,
      });
      return occurrencesRange;
    } catch (error) {
      //
    }
  }
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
          index: dataView.getIndexPattern(),
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
