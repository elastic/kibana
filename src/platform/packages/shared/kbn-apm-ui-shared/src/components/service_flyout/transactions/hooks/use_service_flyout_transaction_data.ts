/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { HttpStart, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core/public';
import type { Coordinate, LatencyAggregationType } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { TransactionGroup } from '../../../transactions_table/types';
import {
  parseIntervalSeconds,
  usePreferredTransactionDataSource,
} from './use_preferred_transaction_data_source';

const NUM_BUCKETS = 20;

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

// TODO: replace with typed callApmApi once it lives in a package outside of APM (https://github.com/elastic/kibana/issues/271155)
interface ServiceTransactionGroupDetailedStat {
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

function toPoints(coords: Array<{ x: number; y: number | null | undefined }>) {
  return coords.map(({ x, y }) => ({ x, y: y ?? null }));
}

export function useServiceFlyoutTransactionData({
  http,
  notifications,
  serviceName,
  environment,
  start,
  end,
  transactionType,
  latencyAggregationType,
  searchQuery,
  refreshToken,
  offset,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType?: LatencyAggregationType;
  searchQuery: string;
  refreshToken?: number;
  offset?: string;
}) {
  const enabled = !!transactionType && !!latencyAggregationType;

  // Single call — shared across both fetches below so GET /internal/apm/time_range_metadata
  // fires exactly once per (start, end) pair regardless of how many fetches are in flight.
  const {
    dataSource,
    isLoading: isDataSourceLoading,
    error: dataSourceError,
  } = usePreferredTransactionDataSource({ http, start, end });

  useEffect(() => {
    if (
      !dataSourceError ||
      (dataSourceError instanceof Error && dataSourceError.name === 'AbortError')
    )
      return;
    const err = dataSourceError as Error | IHttpFetchError<ResponseErrorBody>;
    const toastMessage =
      'response' in err
        ? [
            err.body?.message ?? err.response?.statusText,
            err.response?.status != null ? `(${err.response.status})` : undefined,
            err.response?.url,
          ]
            .filter(Boolean)
            .join(' ')
        : undefined;
    notifications.toasts.addDanger({
      title: i18n.translate('apmUiShared.serviceFlyout.transactions.dataSourceErrorToast', {
        defaultMessage: 'Failed to load transaction data',
      }),
      text: toastMessage,
    });
  }, [dataSourceError, notifications.toasts]);

  const [maxCountExceeded, setMaxCountExceeded] = useState(false);

  useEffect(() => {
    setMaxCountExceeded(false);
  }, [serviceName, environment, start, end, transactionType]);

  const serverSearchQuery = maxCountExceeded ? searchQuery : '';

  const { value: mainResponse, loading: isMainLoading } = useAbortableAsync(
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
      setMaxCountExceeded((prev) => prev || result.maxCountExceeded);
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
      refreshToken,
    ]
  );

  const items: TransactionGroup[] = useMemo(() => {
    const groups = mainResponse?.transactionGroups ?? [];
    const filtered =
      !mainResponse?.maxCountExceeded && searchQuery
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
  }, [mainResponse, searchQuery]);

  const transactionNames = useMemo(() => items.map(({ name }) => name), [items]);

  const { value: detailedResponse, loading: isDetailedLoading } = useAbortableAsync(
    async ({ signal }) => {
      if (!enabled || !dataSource || transactionNames.length === 0) return undefined;

      const rawBucketSize = Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / 1000 / NUM_BUCKETS
      );
      const bucketSizeInSeconds = Math.max(
        rawBucketSize,
        parseIntervalSeconds(dataSource.rollupInterval)
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

  const itemsWithSparklines = useMemo(() => {
    const currentPeriod = detailedResponse?.currentPeriod ?? {};
    const previousPeriod = detailedResponse?.previousPeriod ?? {};
    if (!Object.keys(currentPeriod).length) return items;

    return items.map((item) => {
      const stat = currentPeriod[item.name];
      const comparisonStat = previousPeriod[item.name];
      if (!stat) return item;

      return {
        ...item,
        latency: {
          ...item.latency,
          series: {
            value: toPoints(stat.latency),
            ...(comparisonStat ? { comparison: toPoints(comparisonStat.latency) } : {}),
          },
        },
        throughput: {
          ...item.throughput,
          series: {
            value: toPoints(stat.throughput),
            ...(comparisonStat ? { comparison: toPoints(comparisonStat.throughput) } : {}),
          },
        },
        errorRate: {
          ...item.errorRate,
          series: {
            value: toPoints(stat.errorRate),
            ...(comparisonStat ? { comparison: toPoints(comparisonStat.errorRate) } : {}),
          },
        },
      };
    });
  }, [items, detailedResponse]);

  return {
    items: itemsWithSparklines,
    isLoading: isMainLoading || isDataSourceLoading,
    isSparklineLoading: isDetailedLoading,
    maxCountExceeded,
    hasActiveAlerts: mainResponse?.hasActiveAlerts ?? false,
    error: dataSourceError,
  };
}
