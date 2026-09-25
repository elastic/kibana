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
      if (!isExemplarsEnabled || !dataView) {
        return undefined;
      }

      // Non-OTel metrics have no exemplars stream and never probe.
      const exemplarsIndex = resolveExemplarsIndex(metricItem, originalSource);
      const esqlQuery = createExemplarsQuery({ metricItem, whereStatements, originalSource });
      if (!exemplarsIndex || !esqlQuery) {
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
          filters: fetchParams.filters,
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
    // `fetchParams.timeRange`, `filters` and `lastReloadRequestTime` are rebuilt once per Discover
    // fetch (see `processFetchParams` in kbn-unified-histogram), so this re-fires at the chart's cadence.
    [
      isExemplarsEnabled,
      dataView,
      metricItem,
      whereStatements,
      originalSource,
      search,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.lastReloadRequestTime,
      uiSettings,
      profileId,
      reportError,
      probeExemplarsAvailability,
    ]
  );

  return value;
};
