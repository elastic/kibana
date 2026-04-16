/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useEffect, useMemo, useRef } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { buildMetricsInfoQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { getFieldIconType } from '@kbn/field-utils';
import type { Dimension, MetricsESQLResponse, MetricsInfo, ParsedMetrics } from '../../../../types';
import { useTelemetry } from '../../../../context/ebt_telemetry_context';
import { useChartSectionInspector } from '../../../../context/chart_section_inspector';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { parseMetricsWithTelemetry } from '../utils/parse_metrics_response_with_telemetry';
import { getEsqlQuery } from '../utils/get_esql_query';
import { mergeDimensions } from '../utils/merge_dimensions';

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
  const { trackRequest } = useChartSectionInspector();
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

  // Accumulate dimensions across filtered fetches so that selecting additional
  // breakdown dimensions does not remove previously-available dimensions from
  // the picker. Reset when the base ES|QL query changes (new data source).
  const accumulatedDimensionsRef = useRef<Dimension[]>([]);
  const previousEsqlRef = useRef<string | undefined>(esql);

  if (esql !== previousEsqlRef.current) {
    accumulatedDimensionsRef.current = [];
    previousEsqlRef.current = esql;
  }

  const [{ value, error, loading }, executeFetch] = useAsyncFn(
    async (
      signal: AbortSignal
    ): Promise<(ParsedMetrics & { activeDimensions: Dimension[] }) | null> => {
      const documents = await trackRequest(
        'Grid of metrics',
        'This request queries Elasticsearch to fetch metrics info for the grid.',
        async () => {
          const {
            documents: docs,
            rawResponse,
            requestParams,
          } = await executeEsqlQuery<MetricsESQLResponse>({
            esqlQuery: metricsInfoQuery,
            search: services.data.search.search,
            signal,
            dataView: fetchParams.dataView,
            timeRange: fetchParams.timeRange,
            filters: fetchParams.filters ?? [],
            variables: fetchParams.esqlVariables,
            uiSettings: services.uiSettings,
          });

          return {
            data: docs,
            request: requestParams,
            response: rawResponse,
          };
        }
      );

      const getFieldType = (name: string) => {
        const field = fetchParams.dataView?.getFieldByName(name);
        return field ? getFieldIconType(field) : undefined;
      };

      const parsed = parseMetricsWithTelemetry(documents, getFieldType);

      // Merge newly-fetched dimensions with the accumulated set so that
      // dimensions from the unfiltered response are not lost when a
      // WHERE filter narrows the result set.
      const mergedDimensions = mergeDimensions(
        accumulatedDimensionsRef.current,
        parsed.allDimensions
      );
      accumulatedDimensionsRef.current = mergedDimensions;

      const sortedMetrics: ParsedMetrics = {
        metricItems: [...parsed.metricItems].sort((a, b) =>
          a.metricName.localeCompare(b.metricName)
        ),
        allDimensions: mergedDimensions,
      };

      if (!signal.aborted) {
        trackMetricsInfo(parsed.telemetry);
      }

      return {
        ...sortedMetrics,
        activeDimensions: selectedDimensionNames ?? [],
      };
    },
    [
      metricsInfoQuery,
      trackRequest,
      fetchParams.dataView,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.esqlVariables,
      services.data.search.search,
      services.uiSettings,
      trackMetricsInfo,
      selectedDimensionNames,
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
    activeDimensions: value?.activeDimensions ?? [],
  };
}
