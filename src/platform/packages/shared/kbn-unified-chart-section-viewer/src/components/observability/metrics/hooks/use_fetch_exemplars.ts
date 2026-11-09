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
import { FEATURE_FLAG_DEFAULTS, FEATURE_FLAGS } from '../../../../common/constants';
import { useFeatureFlag } from '../../../../hooks/use_feature_flag';
import type { ParsedMetricItem } from '../../../../types';
import { isSuppressedFetchError } from '../../../chart/utils/is_suppressed_fetch_error';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';
import { createExemplarsQuery } from '../../../../common/utils/esql/create_exemplars_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';

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
}

/**
 * Fetches the exemplars for a metric chart. `exemplars` is absent while in flight, when
 * the flag is off, or when the metric has no time-series query. A failed fetch sets
 * `hasError` and does not throw.
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
}: UseFetchExemplarsParams): UseFetchExemplarsResult => {
  const isExemplarsEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_EXEMPLARS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_EXEMPLARS_ENABLED]
  );
  const reportError = useReportChartSectionError();
  const { dataSource } = fetchParams;
  const timeFieldName = dataSource?.timeFieldName;
  const {
    data: {
      search: { search },
    },
    uiSettings,
  } = services;

  // String identity stays put when METRICS_INFO replaces `metricItem` with an equal object.
  const esqlQuery =
    isExemplarsEnabled && isComponentVisible && dataSource && isSupported
      ? createExemplarsQuery({
          metricItem,
          whereStatements,
          metadataFields,
          originalSource,
          gridSettings,
        })
      : '';

  const { value, loading } = useAbortableAsync<ExemplarsFetchState>(
    async ({ signal }) => {
      if (!esqlQuery) {
        return IDLE_EXEMPLARS_FETCH;
      }

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
        return {
          exemplars: { columns: rawResponse.columns, values: rawResponse.values },
          hasError: false,
        };
      } catch (error) {
        const isSuppressed = isSuppressedFetchError(error);
        if (!isSuppressed) {
          onError(error);
        }
        return {
          exemplars: undefined,
          hasError: !isSuppressed,
          errorMessage: error instanceof Error ? error.message : undefined,
        };
      }
    },
    // `fetchParams.timeRange`, `filters`, `lastReloadRequestTime` and `abortController` are rebuilt
    // once per Discover fetch (see `processFetchParams` in kbn-unified-histogram), so this re-fires at
    // the chart's cadence and aborts the previous request when a new Discover fetch starts.
    [
      esqlQuery,
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

  return { ...(value ?? IDLE_EXEMPLARS_FETCH), isLoading: loading };
};
