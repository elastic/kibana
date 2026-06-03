/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { LatencyAggregationType } from '@kbn/apm-types';
import type { TransactionGroup } from '../../transactions_table/types';

// TODO: replace with typed callApmApi once it lives in a package outside of APM
interface MainStatisticsResponse {
  transactionGroups: Array<{
    name: string;
    transactionType?: string;
    latency?: number | null;
    throughput?: number;
    errorRate?: number;
    alertsCount: number;
    impact?: number;
  }>;
  maxCountExceeded: boolean;
}

export function useServiceFlyoutTransactions({
  http,
  serviceName,
  environment,
  start,
  end,
  transactionType,
  latencyAggregationType,
  searchQuery,
}: {
  http: HttpStart;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType?: LatencyAggregationType;
  searchQuery: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<MainStatisticsResponse | undefined>(undefined);

  useEffect(() => {
    if (!transactionType || !latencyAggregationType) return;

    let cancelled = false;
    setIsLoading(true);

    // TODO: tech debt — using plain http.get with hardcoded documentType/rollupInterval.
    // Migrate to typed callApmApi once that lives outside the APM plugin, and add
    // usePreferredDataSourceAndBucketSize logic for proper data source selection.
    // https://github.com/elastic/kibana/issues/271155
    http
      .get<MainStatisticsResponse>(
        `/internal/apm/services/${encodeURIComponent(
          serviceName
        )}/transactions/groups/main_statistics`,
        {
          query: {
            environment,
            kuery: '',
            start,
            end,
            transactionType,
            useDurationSummary: false,
            latencyAggregationType,
            documentType: 'transactionMetric',
            rollupInterval: '1m',
            searchQuery,
          },
        }
      )
      .then((data) => {
        if (!cancelled) setResponse(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    http,
    serviceName,
    environment,
    start,
    end,
    transactionType,
    latencyAggregationType,
    searchQuery,
  ]);

  const items: TransactionGroup[] = useMemo(
    () =>
      (response?.transactionGroups ?? []).map((group) => ({
        name: group.name,
        transactionType: group.transactionType,
        latency: { value: group.latency ?? null },
        throughput: { value: group.throughput ?? 0 },
        errorRate: { value: group.errorRate ?? null },
        alertsCount: group.alertsCount,
        impact: group.impact != null ? { value: group.impact } : undefined,
      })),
    [response?.transactionGroups]
  );

  return {
    items,
    isLoading,
    maxCountExceeded: response?.maxCountExceeded ?? false,
  };
}
