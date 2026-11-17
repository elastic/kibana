/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsGridSettings } from '@kbn/discover-utils';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useMemo, useRef } from 'react';
import type { ParsedMetricItem } from '../../../../types';
import { isSuppressedFetchError } from '../../../chart/utils/is_suppressed_fetch_error';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';
import { createExemplarsQuery } from '../../../../common/utils/esql/create_exemplars_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';
import type { ExemplarsClusterSupport } from './use_exemplars_cluster_support';

export type ExemplarsResponse = Pick<ESQLSearchResponse, 'columns' | 'values'>;

interface ExemplarsFetchState {
  /** Rows from the last successful fetch. Absent while loading, when skipped, or after a failure. */
  exemplars: ExemplarsResponse | undefined;
  /** True when the last completed fetch failed. Aborts and skipped fetches stay false. */
  hasError: boolean;
  /** Error text from the rejected fetch, including aborts. Callers should read it only when `hasError` is true. */
  errorMessage?: string;
}

export interface UseFetchExemplarsResult extends ExemplarsFetchState {
  /** True until a request settles. Skipped fetches stay false once they resolve. */
  isLoading: boolean;
}

const IDLE_EXEMPLARS_FETCH: ExemplarsFetchState = { exemplars: undefined, hasError: false };
const CHECKING_EXEMPLARS_FETCH: UseFetchExemplarsResult = {
  exemplars: undefined,
  hasError: false,
  isLoading: true,
};

export interface UseFetchExemplarsParams {
  fetchParams: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  metricItem: ParsedMetricItem;
  whereStatements?: string[];
  metadataFields?: string[];
  originalSource?: string;
  gridSettings?: MetricsGridSettings;
  profileId: string;
  /** False for `unsigned_long` charts and heatmaps, which do not fetch exemplars. */
  isSupported: boolean;
  /** False while Discover keeps the grid mounted but hidden; nothing is fetched then. */
  isComponentVisible: boolean;
  /** False until this chart intersects the viewport. A settled search is reused on the way back. */
  isChartVisible: boolean;
  /**
   * Grid-level gate. Per-chart searches run only when this is `supported` and the chart would
   * otherwise fetch. `checking` and `failed` are ignored unless it would.
   */
  clusterSupport: ExemplarsClusterSupport;
}

/**
 * Fetches the exemplars for one metric chart. `exemplars` is absent while in flight, when
 * the grid gate is not `supported`, or when the metric has no time-series query. A failed
 * fetch sets `hasError` and does not throw. A shared cluster failure is not reported again here.
 */
export const useFetchExemplars = ({
  fetchParams,
  services,
  metricItem,
  whereStatements,
  metadataFields,
  originalSource,
  gridSettings,
  profileId,
  isSupported,
  isComponentVisible,
  isChartVisible,
  clusterSupport,
}: UseFetchExemplarsParams): UseFetchExemplarsResult => {
  const reportError = useReportChartSectionError();
  const { dataSource } = fetchParams;
  const timeFieldName = dataSource?.timeFieldName;
  const {
    data: {
      search: { search },
    },
    uiSettings,
  } = services;

  const clusterReady = clusterSupport.status === 'supported';
  // String identity stays put when METRICS_INFO replaces `metricItem` with an equal object.
  // Visibility stays out of this string so scrolling away does not look like a new search.
  const esqlQuery =
    clusterReady && isComponentVisible && dataSource && isSupported
      ? createExemplarsQuery({
          metricItem,
          whereStatements,
          metadataFields,
          originalSource,
          gridSettings,
        })
      : '';
  // Same search identity as the chart embeddable (query, time range, filters, variables,
  // session, reload). `use_fetch_histogram_bounds` uses this shape too. The search client
  // and abort controller stay out: they cancel or run a search, they do not define a new one.
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        esqlQuery,
        timeFrom: fetchParams.timeRange?.from ?? null,
        timeTo: fetchParams.timeRange?.to ?? null,
        filters: fetchParams.filters ?? [],
        variables: fetchParams.esqlVariables ?? [],
        timeFieldName: timeFieldName ?? null,
        lastReloadRequestTime: fetchParams.lastReloadRequestTime ?? null,
        searchSessionId: fetchParams.searchSessionId ?? null,
      }),
    [
      esqlQuery,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.esqlVariables,
      timeFieldName,
      fetchParams.lastReloadRequestTime,
      fetchParams.searchSessionId,
    ]
  );
  const settledRef = useRef<{ key: string; state: ExemplarsFetchState } | undefined>(undefined);

  const { value, loading } = useAbortableAsync<ExemplarsFetchState>(
    async ({ signal }) => {
      if (!esqlQuery) {
        settledRef.current = undefined;
        return IDLE_EXEMPLARS_FETCH;
      }

      const settled = settledRef.current;
      const sameRequest = settled?.key === requestKey;
      // Off screen, or back on screen with the same Discover inputs: keep the settled rows.
      if (!isChartVisible || sameRequest) {
        return settled?.state ?? IDLE_EXEMPLARS_FETCH;
      }

      const remember = (state: ExemplarsFetchState) => {
        if (!signal.aborted) {
          settledRef.current = { key: requestKey, state };
        }
        return state;
      };
      const onError = (error: unknown) =>
        reportError({ error, source: 'useFetchExemplars', labels: { profile_id: profileId } });

      try {
        const { rawResponse } = await executeEsqlQuery({
          esqlQuery,
          search,
          signal,
          timeFieldName,
          timeRange: fetchParams.timeRange,
          filters: fetchParams.filters,
          variables: fetchParams.esqlVariables,
          uiSettings,
          profileId,
          executionContextName: MetricsExecutionContextName.EXEMPLARS,
        });
        return remember({
          exemplars: { columns: rawResponse.columns, values: rawResponse.values },
          hasError: false,
        });
      } catch (error) {
        const isSuppressed = isSuppressedFetchError(error);
        if (!isSuppressed) {
          onError(error);
        }
        const failed: ExemplarsFetchState = {
          exemplars: undefined,
          hasError: !isSuppressed,
          errorMessage: error instanceof Error ? error.message : undefined,
        };
        return isSuppressed ? failed : remember(failed);
      }
    },
    // `fetchParams.timeRange`, `filters`, `lastReloadRequestTime` and `abortController` are rebuilt
    // once per Discover fetch (see `processFetchParams` in kbn-unified-histogram), so this re-fires at
    // the chart's cadence and aborts the previous request when a new Discover fetch starts.
    // `isChartVisible` aborts an in-flight search when the cell leaves the viewport.
    [
      esqlQuery,
      isChartVisible,
      timeFieldName,
      search,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.esqlVariables,
      fetchParams.lastReloadRequestTime,
      fetchParams.abortController,
      uiSettings,
      profileId,
      reportError,
    ],
    // Drop the previous rows as soon as a refetch starts so stale exemplars never render.
    { clearValueOnNext: true }
  );

  // Charts that never fetch stay idle, including while the probe runs or the cluster rejects it.
  if (!isSupported || !isComponentVisible || !dataSource) {
    return { ...IDLE_EXEMPLARS_FETCH, isLoading: false };
  }
  if (clusterSupport.status === 'checking') {
    return CHECKING_EXEMPLARS_FETCH;
  }
  // The flag-off path never searches. Ignore the abortable hook's loading tick.
  if (clusterSupport.status === 'disabled') {
    return { ...IDLE_EXEMPLARS_FETCH, isLoading: false };
  }
  if (clusterSupport.status === 'failed') {
    return {
      exemplars: undefined,
      hasError: true,
      errorMessage: clusterSupport.errorMessage,
      isLoading: false,
    };
  }
  if (!isChartVisible) {
    return { ...(settledRef.current?.state ?? IDLE_EXEMPLARS_FETCH), isLoading: false };
  }

  return { ...(value ?? IDLE_EXEMPLARS_FETCH), isLoading: loading };
};
