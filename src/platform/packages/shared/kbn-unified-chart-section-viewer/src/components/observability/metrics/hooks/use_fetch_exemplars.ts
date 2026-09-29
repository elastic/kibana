/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useAbortableAsync } from '@kbn/react-hooks';
import { FEATURE_FLAG_DEFAULTS, FEATURE_FLAGS } from '../../../../common/constants';
import { useFeatureFlag } from '../../../../hooks/use_feature_flag';
import type { ParsedMetricItem } from '../../../../types';
import { isSuppressedFetchError } from '../../../chart/utils/is_suppressed_fetch_error';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';
import { createExemplarsQuery } from '../../../../common/utils/esql/create_exemplars_query';
import { resolveExemplarsIndex } from '../../../../common/utils/exemplars/derive_exemplars_index';
import { translateExemplarFilters } from '../../../../common/utils/exemplars/translate_exemplar_filters';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';
import { useExemplarsAvailabilityProbe } from '../context/exemplars_availability_provider';

export type ExemplarsResponse = Pick<ESQLSearchResponse, 'columns' | 'values'>;

export interface UseFetchExemplarsParams {
  fetchParams: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  metricItem: ParsedMetricItem;
  whereStatements?: string[];
  originalSource?: string;
  profileId: string;
  /** False while Discover keeps the grid mounted but hidden; nothing is fetched then. */
  isComponentVisible: boolean;
}

/**
 * Fetches the exemplars for a metric chart. Returns `undefined` while in flight, when
 * the flag is off, or when the metric has no exemplars. Never throws.
 */
export const useFetchExemplars = ({
  fetchParams,
  services,
  metricItem,
  whereStatements,
  originalSource,
  profileId,
  isComponentVisible,
}: UseFetchExemplarsParams): ExemplarsResponse | undefined => {
  const isExemplarsEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_EXEMPLARS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_EXEMPLARS_ENABLED]
  );
  const reportError = useReportChartSectionError();
  const probeExemplarsAvailability = useExemplarsAvailabilityProbe();
  const { dataView } = fetchParams;
  const {
    data: {
      search: { search },
    },
    uiSettings,
  } = services;

  const { value } = useAbortableAsync<ExemplarsResponse | undefined>(
    async ({ signal }) => {
      if (!isExemplarsEnabled || !isComponentVisible || !dataView) {
        return undefined;
      }

      // Non-OTel metrics have no exemplars stream and never probe.
      const exemplarsIndex = resolveExemplarsIndex(metricItem, originalSource);
      if (!exemplarsIndex) {
        return undefined;
      }

      const esqlQuery = createExemplarsQuery({ metricItem, exemplarsIndex, whereStatements });
      if (!esqlQuery) {
        return undefined;
      }

      const onError = (error: unknown) =>
        reportError({ error, source: 'useFetchExemplars', labels: { profile_id: profileId } });

      const metricsByStream = await probeExemplarsAvailability({
        fetchId: fetchParams.lastReloadRequestTime,
        search,
        dataView,
        timeRange: fetchParams.timeRange,
        uiSettings,
        profileId,
        onError,
      });
      if (signal.aborted || !metricsByStream.get(exemplarsIndex)?.has(metricItem.metricName)) {
        return undefined;
      }

      try {
        const { rawResponse } = await executeEsqlQuery({
          esqlQuery,
          search,
          signal,
          dataView,
          timeRange: fetchParams.timeRange,
          // Filters on the chart's own metric field move onto `value`; other metric fields cannot
          // apply to these exemplars and are dropped.
          filters: translateExemplarFilters(fetchParams.filters, metricItem.metricName),
          // The copied `WHERE` clauses may reference Discover control variables (`?service`).
          variables: fetchParams.esqlVariables,
          uiSettings,
          profileId,
          executionContextName: MetricsExecutionContextName.EXEMPLARS,
        });
        return { columns: rawResponse.columns, values: rawResponse.values };
      } catch (error) {
        if (!isSuppressedFetchError(error)) {
          onError(error);
        }
        return undefined;
      }
    },
    // `fetchParams.timeRange`, `filters`, `lastReloadRequestTime` and `abortController` are rebuilt
    // once per Discover fetch (see `processFetchParams` in kbn-unified-histogram), so this re-fires at
    // the chart's cadence and, like the metrics-info fetch, aborts the previous request when a new
    // Discover fetch starts.
    [
      isExemplarsEnabled,
      isComponentVisible,
      dataView,
      metricItem,
      whereStatements,
      originalSource,
      search,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.esqlVariables,
      fetchParams.lastReloadRequestTime,
      fetchParams.abortController,
      uiSettings,
      profileId,
      reportError,
      probeExemplarsAvailability,
    ],
    // Drop the previous rows as soon as a refetch starts so stale exemplars never render.
    { clearValueOnNext: true }
  );

  return value;
};
