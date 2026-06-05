/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { LatencyAggregationType } from '@kbn/apm-types';
import { useAbortableAsync } from '@kbn/react-hooks';
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

  const { dataSource, isLoading: isDataSourceLoading } = usePreferredTransactionDataSource({
    http,
    start,
    end,
  });

  const [maxCountExceeded, setMaxCountExceeded] = useState(false);
  const serverSearchQuery = maxCountExceeded ? searchQuery : '';

  const { value: response, loading: isLoading } = useAbortableAsync(
    async ({ signal }) => {
      if (!enabled || !dataSource) return undefined;
      const result = await http.get<MainStatisticsResponse>(
        `/internal/apm/services/${encodeURIComponent(
          serviceName
        )}/transactions/groups/main_statistics`,
        {
          signal,
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
      );
      setMaxCountExceeded(result.maxCountExceeded);
      return result;
    },
    [
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
    ]
  );

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
    isLoading: isLoading || isDataSourceLoading,
    maxCountExceeded: response?.maxCountExceeded ?? false,
    hasActiveAlerts: response?.hasActiveAlerts ?? false,
  };
}
