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
import { apm } from '@elastic/apm-rum';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { buildMetricsInfoQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { getFieldIconType } from '@kbn/field-utils';
import type { Dimension, MetricsESQLResponse, MetricsInfo, ParsedMetrics } from '../../../../types';
import { useTelemetry } from '../../../../context/ebt_telemetry_context';
import { useChartSectionInspector } from '../../../../context/chart_section_inspector';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { parseMetricsWithTelemetry } from '../utils/parse_metrics_response_with_telemetry';
import { getEsqlQuery } from '../utils/get_esql_query';
import { isSuppressedFetchError } from '../utils/is_suppressed_fetch_error';

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
  profileId: string;
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
      try {
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
              // Forwarded onto executionContext.meta so the server-side APM
              // transaction picks it up as kibana_meta_profile_id via the
              // pipeline added in #263201. Keeps request and error telemetry
              // filterable by the same profile_id.
              profileId,
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
      } catch (err) {
        // Don't report cancellations: signal.aborted covers the local AbortController
        // path; isSuppressedFetchError covers AbortErrors thrown from the data plugin.
        if (!signal.aborted && !isSuppressedFetchError(err) && err instanceof Error) {
          // Tag the browser-side APM error with the same profile_id that the
          // request transaction carries via executionContext.meta (forwarded
          // to executeEsqlQuery above). Server-side propagation tags the
          // transaction automatically; this explicit label ensures the
          // browser RUM error document is filterable by the same dimension
          // when no RUM transaction is active to inherit labels from.
          apm.captureError(err, { labels: { profile_id: profileId } });
        }
        throw err;
      }
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
      profileId,
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

  return {
    loading,
    error: error ?? null,
    metricItems: value?.metricItems ?? [],
    allDimensions: value?.allDimensions ?? [],
    activeDimensions: value?.activeDimensions ?? [],
  };
}
