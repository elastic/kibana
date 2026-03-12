/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useEffect } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { Dimension, ParsedMetricItem } from '../../../types';
import { buildMetricsInfoQuery } from '../utils/append_metrics_info';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { parseMetricsResponse } from '../utils/parse_metrics_response';

export interface MetricsInfoResponse {
  loading: boolean;
  error: Error | null;
  metricItems: ParsedMetricItem[];
  allDimensions: string[];
}

/**
 * Fetches METRICS_INFO when in Metrics Experience (non-transformational ES|QL, chart visible).
 * When selectedDimensionNames has more than one item, refetches with a WHERE filter so only
 * metrics that have at least one of those dimensions are returned.
 * Returns loading state, error, and parsed metrics info for the grid.
 */
export function useFetchMetricsData({
  fetchParams,
  services,
  isComponentVisible,
  selectedDimensionNames,
}: {
  fetchParams: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  isComponentVisible: boolean;
  selectedDimensionNames?: Dimension[];
}): MetricsInfoResponse {
  const esql =
    fetchParams.query && isOfAggregateQueryType(fetchParams.query)
      ? fetchParams.query.esql
      : undefined;
  const shouldFetch =
    isComponentVisible && !!esql && !!fetchParams.isESQLQuery && !hasTransformationalCommand(esql);

  const [{ value, error, loading }, executeFetch] =
    useAsyncFn(async (): Promise<ParsedMetricItem | null> => {
      const dimensions = selectedDimensionNames?.map((dimension) => dimension.name);
      const metricsInfoQuery = buildMetricsInfoQuery(esql, dimensions);
      const result = await executeEsqlQuery({
        esqlQuery: metricsInfoQuery,
        search: services.data.search.search,
        signal: fetchParams.abortController?.signal,
        dataView: fetchParams.dataView,
        timeRange: fetchParams.timeRange,
        filters: fetchParams.filters ?? [],
        variables: fetchParams.esqlVariables,
        uiSettings: services.uiSettings,
      });

      return parseMetricsResponse(result);
    }, [
      shouldFetch,
      esql,
      selectedDimensionNames,
      fetchParams.dataView,
      fetchParams.timeRange,
      fetchParams.abortController,
      fetchParams.filters,
      fetchParams.esqlVariables,
      services.data.search.search,
      services.uiSettings,
    ]);

  useEffect(() => {
    if (!shouldFetch || !fetchParams.dataView) {
      return;
    }
    const dimensions = selectedDimensionNames?.map((dimension) => dimension.name);

    const metricsInfoQuery = buildMetricsInfoQuery(esql, dimensions);

    if (!metricsInfoQuery) {
      return;
    }
    executeFetch();
  }, [
    shouldFetch,
    esql,
    selectedDimensionNames,
    fetchParams.dataView,
    fetchParams.timeRange,
    fetchParams.abortController,
    fetchParams.filters,
    fetchParams.esqlVariables,
    executeFetch,
  ]);

  return {
    loading,
    error: error ?? null,
    metricItems:
      value?.metricItems.sort((a: ParsedMetricItem, b: ParsedMetricItem) =>
        a.metricName.localeCompare(b.metricName)
      ) ?? [],
    allDimensions: value?.allDimensions.sort((a: string, b: string) => a.localeCompare(b)) ?? [],
  };
}
