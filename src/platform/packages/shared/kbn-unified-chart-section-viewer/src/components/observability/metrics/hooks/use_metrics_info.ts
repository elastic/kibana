/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { Dimension, ParsedMetricsInfo } from '../../../../..';
import { buildMetricsInfoQuery } from '../utils/append_metrics_info';
import { fetchMetricsInfo } from '../utils/fetch_metrics_info';
import { parseMetricsInfoResponse } from '../utils/parse_metrics_info_response';
import { useMetricsExperienceFieldsContext } from '../context/metrics_experience_fields_provider';

export interface MetricsInfoResponse {
  loading: boolean;
  error: Error | null;
  metricsInfo: ParsedMetricsInfo | null;
}

/**
 * Fetches METRICS_INFO when in Metrics Experience (non-transformational ES|QL, chart visible).
 * When selectedDimensionNames has more than one item, refetches with a WHERE filter so only
 * metrics that have at least one of those dimensions are returned.
 * Returns loading state, error, and parsed metrics info for the grid.
 */
export function useMetricsInfo({
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metricsInfo, setMetricsInfo] = useState<ParsedMetricsInfo | null>(null);
  const esql =
    fetchParams.query && isOfAggregateQueryType(fetchParams.query)
      ? fetchParams.query.esql
      : undefined;
  const shouldFetch =
    isComponentVisible && !!esql && !!fetchParams.isESQLQuery && !hasTransformationalCommand(esql);

  const selectedDimensions = selectedDimensionNames?.map((dimension) => dimension.name);
  useEffect(() => {
    if (!shouldFetch || !fetchParams.dataView) {
      setLoading(false);
      setError(null);
      setMetricsInfo(null);
      return;
    }

    const metricsInfoQuery = buildMetricsInfoQuery(esql, selectedDimensions);
    if (!metricsInfoQuery) {
      setLoading(false);
      setMetricsInfo(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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
    })
      .then((response) => {
        if (cancelled) return;
        const parsed = parseMetricsInfoResponse(response);
        setMetricsInfo({
          metricFields: parsed.metricFields,
          allDimensionFields: parsed.allDimensionFields,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setMetricsInfo(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setError(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    shouldFetch,
    esql,
    selectedDimensionNames,
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

  return { loading, error, metricsInfo };
}
