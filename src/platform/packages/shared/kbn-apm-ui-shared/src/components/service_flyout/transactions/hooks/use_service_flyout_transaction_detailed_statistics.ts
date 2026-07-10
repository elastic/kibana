/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { LatencyAggregationType } from '@kbn/apm-types';
import type { Coordinate } from '@kbn/apm-types';
import { useAbortableAsync } from '@kbn/react-hooks';
import { usePreferredTransactionDataSource } from './use_preferred_transaction_data_source';

// Matches the numBuckets value used by APM's transactions table.
const NUM_BUCKETS = 20;

// TODO: replace with typed callApmApi once it lives in a package outside of APM (https://github.com/elastic/kibana/issues/271155)
export interface ServiceTransactionGroupDetailedStat {
  transactionName: string;
  latency: Coordinate[];
  throughput: Coordinate[];
  errorRate: Coordinate[];
  impact: number;
}

interface DetailedStatisticsResponse {
  currentPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
}

export function useServiceFlyoutTransactionDetailedStatistics({
  http,
  serviceName,
  environment,
  start,
  end,
  transactionType,
  latencyAggregationType,
  transactionNames,
  offset,
}: {
  http: HttpStart;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType?: LatencyAggregationType;
  transactionNames: string[];
  offset?: string;
}) {
  const enabled = !!transactionType && !!latencyAggregationType && transactionNames.length > 0;

  const { dataSource, isLoading: isDataSourceLoading } = usePreferredTransactionDataSource({
    http,
    start,
    end,
  });

  const { value: response, loading: isDetailedLoading } = useAbortableAsync(
    async ({ signal }) => {
      if (!enabled || !dataSource) return undefined;

      const bucketSizeInSeconds = Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / 1000 / NUM_BUCKETS
      );

      return http.get<DetailedStatisticsResponse>(
        `/internal/apm/services/${encodeURIComponent(
          serviceName
        )}/transactions/groups/detailed_statistics`,
        {
          signal,
          query: {
            environment,
            kuery: '',
            start,
            end,
            transactionType,
            latencyAggregationType,
            documentType: dataSource.documentType,
            rollupInterval: dataSource.rollupInterval,
            bucketSizeInSeconds,
            useDurationSummary: false,
            transactionNames: JSON.stringify(transactionNames),
            ...(offset !== undefined ? { offset } : {}),
          },
        }
      );
    },
    [
      http,
      serviceName,
      environment,
      start,
      end,
      transactionType,
      latencyAggregationType,
      transactionNames,
      offset,
      enabled,
      dataSource,
    ]
  );

  return {
    currentPeriod: response?.currentPeriod ?? {},
    previousPeriod: response?.previousPeriod ?? {},
    isLoading: isDetailedLoading || isDataSourceLoading,
  };
}
