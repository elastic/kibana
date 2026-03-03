/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import type {
  UnifiedHistogramFetchParams,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { buildMetricsInfoQuery } from '../utils/append_metrics_info';
import { fetchMetricsInfo } from '../utils/fetch_metrics_info';

/**
 * Triggers a METRICS_INFO fetch when in Metrics Experience (non-transformational ES|QL, chart visible).
 */
export function useMetricsInfo(
  fetchParams: UnifiedHistogramFetchParams,
  services: UnifiedHistogramServices,
  isComponentVisible: boolean
): void {
  const esql =
    fetchParams.query && 'esql' in fetchParams.query
      ? (fetchParams.query as { esql: string }).esql
      : undefined;
  const shouldFetch =
    isComponentVisible && !!esql && !!fetchParams.isESQLQuery && !hasTransformationalCommand(esql);

  useEffect(() => {
    if (!shouldFetch || !fetchParams.dataView) {
      return;
    }

    const metricsInfoQuery = buildMetricsInfoQuery(esql);
    if (!metricsInfoQuery) {
      return;
    }

    const signal = fetchParams.abortController?.signal;

    fetchMetricsInfo({
      esqlQuery: metricsInfoQuery,
      search: services.data.search.search,
      signal,
      dataView: fetchParams.dataView,
      timeRange: fetchParams.timeRange,
      filters: fetchParams.filters ?? [],
      variables: fetchParams.esqlVariables,
      uiSettings: services.uiSettings,
    }).catch(() => {
      // Fire-and-forget; ignore errors (e.g. abort or network)
    });
  }, [
    shouldFetch,
    esql,
    fetchParams.dataView?.id,
    fetchParams.timeRange?.from,
    fetchParams.timeRange?.to,
    fetchParams.abortController,
    fetchParams.filters,
    fetchParams.esqlVariables,
    fetchParams.dataView,
    fetchParams.timeRange,
    services.data.search.search,
    services.uiSettings,
  ]);
}
