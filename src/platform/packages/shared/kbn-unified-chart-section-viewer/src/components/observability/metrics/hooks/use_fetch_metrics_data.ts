/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useEffect, useMemo } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { buildMetricsInfoQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { getFieldIconType } from '@kbn/field-utils';
import type { Dimension, MetricsESQLResponse, MetricsInfo, ParsedMetrics } from '../../../../types';
import { useTelemetry } from '../../../../context/ebt_telemetry_context';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { parseMetricsWithTelemetry } from '../utils/parse_metrics_response_with_telemetry';
import { getEsqlQuery } from '../utils/get_esql_query';

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
}): MetricsInfo {
  const { trackMetricsInfo } = useTelemetry();
  const esql = getEsqlQuery(fetchParams.query);

  const shouldFetch = isComponentVisible && !!esql && !hasTransformationalCommand(esql);

  const selectedDimensions = useMemo(
    () => selectedDimensionNames?.map((dimension) => dimension.name),
    [selectedDimensionNames]
  );

  const metricsInfoQuery = useMemo(
    () => buildMetricsInfoQuery(esql, selectedDimensions),
    [esql, selectedDimensions]
  );

  const [{ value, error, loading }, executeFetch] = useAsyncFn(
    async (signal: AbortSignal): Promise<ParsedMetrics | null> => {
      const result = await executeEsqlQuery<MetricsESQLResponse>({
        esqlQuery: metricsInfoQuery,
        search: services.data.search.search,
        signal,
        dataView: fetchParams.dataView,
        timeRange: fetchParams.timeRange,
        filters: fetchParams.filters ?? [],
        variables: fetchParams.esqlVariables,
        uiSettings: services.uiSettings,
      });

      const getFieldType = (name: string) => {
        const field = fetchParams.dataView?.getFieldByName(name);
        return field ? getFieldIconType(field) : undefined;
      };

      const parsed = parseMetricsWithTelemetry(result, getFieldType);

      const sortedMetrics: ParsedMetrics = {
        metricItems: [...parsed.metricItems].sort((a, b) =>
          a.metricName.localeCompare(b.metricName)
        ),
        allDimensions: [...parsed.allDimensions].sort((a, b) => a.name.localeCompare(b.name)),
      };

      if (!signal.aborted) {
        trackMetricsInfo(parsed.telemetry);
      }

      return sortedMetrics;
    },
    [
      metricsInfoQuery,
      fetchParams.dataView,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.esqlVariables,
      services.data.search.search,
      services.uiSettings,
      trackMetricsInfo,
    ]
  );

  useEffect(() => {
    if (!shouldFetch || !fetchParams.dataView) {
      return;
    }
    const abortController = new AbortController();
    executeFetch(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [
    shouldFetch,
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
    metricItems: value?.metricItems ?? [],
    allDimensions: value?.allDimensions ?? [],
  };
}
