/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useAbortableAsync } from '@kbn/react-hooks';
import { FEATURE_FLAG_DEFAULTS, FEATURE_FLAGS } from '../../../../common/constants';
import { getSearchErrorAttributes } from '../../../../common/errors/classify_chart_section_error';
import { isEsqlResponseError } from '../../../../common/errors/esql_response_error';
import { useFeatureFlag } from '../../../../hooks/use_feature_flag';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';
import { isSuppressedFetchError } from '../../../chart/utils/is_suppressed_fetch_error';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';

/** No index, filters, or time range, so a chart filter cannot fail the probe. */
const PROBE_QUERY = 'SET exemplars = TRUE;\nROW 1';

const UNKNOWN_EXEMPLARS_SETTING = /unknown setting \[exemplars\]/i;

export type ExemplarsClusterSupport =
  | { status: 'disabled' }
  | { status: 'checking' }
  | { status: 'supported' }
  | { status: 'failed'; errorMessage?: string };

const DISABLED: ExemplarsClusterSupport = { status: 'disabled' };
const CHECKING: ExemplarsClusterSupport = { status: 'checking' };
const SUPPORTED: ExemplarsClusterSupport = { status: 'supported' };

let cachedSessionClusterSupport: ExemplarsClusterSupport | undefined;

/** Clears the session cache. Tests call this so cases do not share a cluster result. */
export const resetExemplarsClusterSupportCache = (): void => {
  cachedSessionClusterSupport = undefined;
};

/** A plain `Error` that merely quotes the setting is retried; only an Elasticsearch error is cached. */
const isUnknownExemplarsSetting = (error: unknown): boolean =>
  error instanceof Error &&
  UNKNOWN_EXEMPLARS_SETTING.test(error.message) &&
  (isEsqlResponseError(error) || getSearchErrorAttributes(error)?.error != null);

export interface UseExemplarsClusterSupportParams {
  fetchParams: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  profileId: string;
  /** False while Discover keeps the grid mounted but hidden; nothing is probed then. */
  isComponentVisible: boolean;
}

/** Probes once per session so charts skip exemplars when the cluster rejects `SET exemplars`. */
export const useExemplarsClusterSupport = ({
  fetchParams,
  services,
  profileId,
  isComponentVisible,
}: UseExemplarsClusterSupportParams): ExemplarsClusterSupport => {
  const isExemplarsEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_EXEMPLARS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_EXEMPLARS_ENABLED]
  );
  const reportError = useReportChartSectionError();
  const { dataSource } = fetchParams;
  const {
    data: {
      search: { search },
    },
    uiSettings,
  } = services;
  const shouldProbe = isExemplarsEnabled && isComponentVisible && dataSource != null;

  const { value, loading } = useAbortableAsync(
    async ({ signal }): Promise<ExemplarsClusterSupport | undefined> => {
      if (!shouldProbe || cachedSessionClusterSupport) {
        return cachedSessionClusterSupport;
      }

      try {
        await executeEsqlQuery({
          esqlQuery: PROBE_QUERY,
          search,
          signal,
          uiSettings,
          profileId,
          executionContextName: MetricsExecutionContextName.EXEMPLARS_CLUSTER_SUPPORT,
        });
        cachedSessionClusterSupport = SUPPORTED;
        return SUPPORTED;
      } catch (error) {
        if (isSuppressedFetchError(error)) {
          return undefined;
        }

        reportError({
          error,
          source: 'useExemplarsClusterSupport',
          labels: { profile_id: profileId },
        });
        const errorMessage = error instanceof Error ? error.message : undefined;
        const failure: ExemplarsClusterSupport = { status: 'failed', errorMessage };
        // An unknown setting will fail again, so keep it for the session. Other failures retry.
        if (isUnknownExemplarsSetting(error)) {
          cachedSessionClusterSupport = failure;
        }
        return failure;
      }
    },
    // Discover rebuilds the reload time and abort controller on every fetch.
    // Cached results skip the probe. A transient failure is retried on the next fetch.
    [
      shouldProbe,
      search,
      uiSettings,
      profileId,
      fetchParams.lastReloadRequestTime,
      fetchParams.abortController,
      reportError,
    ]
  );

  if (!shouldProbe) {
    return DISABLED;
  }
  if (cachedSessionClusterSupport) {
    return cachedSessionClusterSupport;
  }
  // A settled transient failure stays visible until the next fetch starts.
  if (!loading && value?.status === 'failed') {
    return value;
  }
  return CHECKING;
};
