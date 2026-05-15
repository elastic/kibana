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
import { reportChartSectionError } from '../../../chart/utils/report_chart_section_error';

/**
 * Fetches METRICS_INFO when in Metrics Experience (non-transformational ES|QL, chart visible).
 * When selectedDimensionNames is non-empty, refetches with a WHERE filter so only
 * metrics that have all of the selected dimensions are returned.
 * Returns loading state, error, and parsed metrics info for the grid.
 */
export function useFetchMetricsData({
  fetchParams,
  services,
  isComponentVisible,
  selectedDimensionNames,
  profileId,
}: {
  fetchParams: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  isComponentVisible: boolean;
  selectedDimensionNames?: Dimension[];
  /**
   * Profile ID of the surrounding data source profile. Forwarded as an APM
   * correlation label on captured errors so dashboards can filter
   * `useFetchMetricsData` failures by profile, matching the
   * `executionContext.meta.profile_id` we attach on the Lens side.
   */
  profileId?: string;
}): MetricsInfo {
  const { trackMetricsInfo } = useTelemetry();
  const { trackRequest } = useChartSectionInspector();
  const esql = getEsqlQuery(fetchParams.query);

  const shouldFetch = isComponentVisible && !!esql && !hasTransformationalCommand(esql);

  // Pre-fetch defense against dimensions the active stream does not map.
  // Pushing a field name that is not in the dataView into the
  // `WHERE TO_STRING(field) IS NOT NULL` clause breaks the query and surfaces
  // "Unable to load visualization". The post-fetch state wipe (against
  // `allDimensions`) lives in `MetricsExperienceGrid` via `useDimensionsWipe`.
  const appliedDimensions = useMemo(() => {
    if (!selectedDimensionNames?.length || !fetchParams.dataView) {
      return selectedDimensionNames;
    }
    return selectedDimensionNames.filter(
      (dimension) => fetchParams.dataView!.getFieldByName(dimension.name) != null
    );
  }, [selectedDimensionNames, fetchParams.dataView]);

  const appliedDimensionNames = useMemo(
    () => appliedDimensions?.map((dimension) => dimension.name),
    [appliedDimensions]
  );

  const metricsInfoQuery = useMemo(
    () => buildMetricsInfoQuery(esql, appliedDimensionNames),
    [esql, appliedDimensionNames]
  );

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

      const sortedMetrics: ParsedMetrics = {
        metricItems: [...parsed.metricItems].sort((a, b) =>
          a.metricName.localeCompare(b.metricName)
        ),
        allDimensions: [...parsed.allDimensions].sort((a, b) => a.name.localeCompare(b.name)),
      };

      if (!signal.aborted) {
        trackMetricsInfo(parsed.telemetry);
      }

      return {
        ...sortedMetrics,
        activeDimensions: appliedDimensions ?? [],
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
      appliedDimensions,
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
    fetchParams.dataView,
    fetchParams.timeRange,
    fetchParams.abortController,
    fetchParams.filters,
    fetchParams.esqlVariables,
    executeFetch,
  ]);

  // Report any landed fetch error to APM. De-duped via a ref so repeat
  // renders with the same error instance don't spam the sink.
  // The util internally no-ops on AbortError so cancellations stay silent.
  const lastReportedErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (!error || error === lastReportedErrorRef.current) {
      return;
    }
    lastReportedErrorRef.current = error;
    reportChartSectionError({
      error,
      source: 'useFetchMetricsData',
      // Correlation labels so the Errors view in APM can filter
      // metrics-grid fetch failures by upstream profile. The reporter
      // drops empty / undefined values so an unset profileId is safe.
      labels: {
        profile_id: profileId ?? '',
      },
    });
  }, [error, profileId]);

  return {
    loading,
    error: error ?? null,
    metricItems: value?.metricItems ?? [],
    allDimensions: value?.allDimensions ?? [],
    activeDimensions: value?.activeDimensions ?? [],
  };
}
