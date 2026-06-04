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
import type { TransactionGroup } from '../../../transactions_table/types';
import { usePreferredTransactionDataSource } from './use_preferred_transaction_data_source';

// TODO: replace with typed callApmApi once it lives in a package outside of APM (https://github.com/elastic/kibana/issues/271155)
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
  hasActiveAlerts: boolean;
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
  const enabled = !!transactionType && !!latencyAggregationType;

  const dataSource = usePreferredTransactionDataSource({ http, start, end });

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<MainStatisticsResponse | undefined>(undefined);

  // When the server returns fewer groups than the limit, all data is already in memory —
  // pass an empty searchQuery to avoid re-fetching on every keystroke.
  // When maxCountExceeded is true the full list is truncated, so the server must filter.
  const serverSearchQuery = response?.maxCountExceeded ? searchQuery : '';

  useEffect(() => {
    if (!enabled || !dataSource) return;

    let cancelled = false;
    setIsLoading(true);

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
            documentType: dataSource.documentType,
            rollupInterval: dataSource.rollupInterval,
            searchQuery: serverSearchQuery,
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
    serverSearchQuery,
    enabled,
    dataSource,
  ]);

  const items: TransactionGroup[] = useMemo(() => {
    const groups = response?.transactionGroups ?? [];
    const filtered =
      !response?.maxCountExceeded && searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : groups;
    return filtered.map((group) => ({
      name: group.name,
      transactionType: group.transactionType,
      latency: { value: group.latency ?? null },
      throughput: { value: group.throughput ?? 0 },
      errorRate: { value: group.errorRate ?? null },
      alertsCount: group.alertsCount,
      impact: group.impact != null ? { value: group.impact } : undefined,
    }));
  }, [response, searchQuery]);

  return {
    items,
    isLoading,
    maxCountExceeded: response?.maxCountExceeded ?? false,
    hasActiveAlerts: response?.hasActiveAlerts ?? false,
  };
}
