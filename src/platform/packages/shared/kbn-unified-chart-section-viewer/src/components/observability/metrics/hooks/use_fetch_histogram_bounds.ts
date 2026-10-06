/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useAbortableAsync } from '@kbn/react-hooks';
import type {
  HistogramBoundsQuery,
  HistogramBoundsResult,
  ParsedMetricItem,
} from '../../../../types';
import {
  createHistogramBoundsQuery,
  HISTOGRAM_BOUNDS_MAX_COLUMN,
  HISTOGRAM_BOUNDS_MIN_COLUMN,
} from '../../../../common/utils/esql/create_histogram_bounds_query';
import {
  parseHistogramBounds,
  type RawHistogramBound,
} from '../../../../common/utils/classify_histogram_bounds';
import { FEATURE_FLAG_DEFAULTS, FEATURE_FLAGS } from '../../../../common/constants';
import { useTelemetry } from '../../../../context/ebt_telemetry_context';
import { useFeatureFlag } from '../../../../hooks';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from '../utils/execution_context_enums';
import { buildEsqlQueryFailureEvent } from '../telemetry/build_esql_query_failure_event';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';

export type HistogramBoundsByMetricKey = ReadonlyMap<string, HistogramBoundsResult>;

type BoundsRow = Record<string, RawHistogramBound>;

const EMPTY_BOUNDS: HistogramBoundsByMetricKey = new Map();

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isBoundsEntry = (
  entry: readonly [string, HistogramBoundsResult] | undefined
): entry is readonly [string, HistogramBoundsResult] => entry !== undefined;

/**
 * Fetches one MIN/MAX request per visible histogram chart and keeps only finite ranges where min < max.
 */
export const useFetchHistogramBounds = ({
  enabled,
  metricItems,
  fetchParams,
  services,
  whereStatements,
  originalSource,
  profileId,
}: {
  enabled: boolean;
  metricItems: readonly ParsedMetricItem[];
  /** Fetch params captured when `metricItems` landed. Undefined until the first METRICS_INFO response. */
  fetchParams?: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  whereStatements: readonly string[];
  originalSource?: string;
  profileId: string;
}): { readonly loading: boolean; readonly bounds: HistogramBoundsByMetricKey } => {
  const reportError = useReportChartSectionError();
  const { trackEsqlQueryFailure } = useTelemetry();
  const isHeatmapsEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_HEATMAPS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_HEATMAPS_ENABLED]
  );
  const fetchEnabled = enabled && isHeatmapsEnabled;

  const queries = useMemo(
    () =>
      metricItems.flatMap<HistogramBoundsQuery>((metricItem) => {
        const boundsQuery = createHistogramBoundsQuery({
          metricItem,
          whereStatements,
          originalSource,
        });
        return boundsQuery ? [boundsQuery] : [];
      }),
    [metricItems, whereStatements, originalSource]
  );
  const {
    dataSource,
    relativeTimeRange,
    filters,
    esqlVariables,
    searchSessionId,
  }: Partial<ChartSectionProps['fetchParams']> = fetchParams ?? {};
  const search = services.data.search.search;
  const { uiSettings } = services;

  // `fetchParams` is the snapshot captured when `metricItems` landed, so the session, time
  // range, filters, and query move together with the items. Reading Discover's live params
  // instead would fire a request per stale chart one render early. Discover replaces
  // `abortController` and bumps `lastReloadRequestTime` on chart-only refetches (breakdown,
  // vis context); keying on either would send a second MIN/MAX request per chart. Query order
  // is ignored so a grid reorder does not refetch.
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        enabled: fetchEnabled,
        queries: [...queries].sort((left, right) => left.metricKey.localeCompare(right.metricKey)),
        timeFrom: relativeTimeRange?.from ?? null,
        timeTo: relativeTimeRange?.to ?? null,
        filters: filters ?? [],
        variables: esqlVariables ?? [],
        indexPattern: dataSource?.title ?? null,
        timeFieldName: dataSource?.timeFieldName ?? null,
        searchSessionId: searchSessionId ?? null,
      }),
    [fetchEnabled, queries, relativeTimeRange, filters, esqlVariables, dataSource, searchSessionId]
  );

  const queriesRef = useLatest(queries);
  const enabledRef = useLatest(fetchEnabled);
  const dataSourceRef = useLatest(dataSource);
  const relativeTimeRangeRef = useLatest(relativeTimeRange);
  const filtersRef = useLatest(filters);
  const esqlVariablesRef = useLatest(esqlVariables);
  const searchRef = useLatest(search);
  const uiSettingsRef = useLatest(uiSettings);
  const profileIdRef = useLatest(profileId);
  const reportErrorRef = useLatest(reportError);
  const trackEsqlQueryFailureRef = useLatest(trackEsqlQueryFailure);

  const { loading, value } = useAbortableAsync(
    ({ signal }) => {
      const currentQueries = queriesRef.current;
      const currentDataSource = dataSourceRef.current;
      if (!enabledRef.current || currentQueries.length === 0 || !currentDataSource) {
        return EMPTY_BOUNDS;
      }

      const failures: Array<{ error: unknown; boundsQuery: HistogramBoundsQuery }> = [];

      const reportBatchFailure = (
        batch: ReadonlyArray<{ error: unknown; boundsQuery: HistogramBoundsQuery }>
      ) => {
        const [first] = batch;
        const error =
          batch.length === 1
            ? first.error
            : new AggregateError(
                batch.map(({ error: failure }) => toError(failure)),
                `Histogram bounds failed for ${batch.length} charts: ${batch
                  .map(({ boundsQuery }) => boundsQuery.metricKey)
                  .join(', ')}`
              );

        reportErrorRef.current({
          error,
          source: 'useFetchHistogramBounds',
          labels: {
            page: `metrics_${MetricsExecutionContextAction.FETCH}_${MetricsExecutionContextName.HISTOGRAM_BOUNDS}`,
            profile_id: profileIdRef.current,
            ...(batch.length === 1 ? { chart_id: first.boundsQuery.metricKey } : {}),
          },
        });

        const failureEvent = buildEsqlQueryFailureEvent({
          error: first.error,
          esqlQuery: first.boundsQuery.esqlQuery,
        });
        if (failureEvent) {
          trackEsqlQueryFailureRef.current(failureEvent);
        }
      };

      const fetchBounds = async (
        boundsQuery: HistogramBoundsQuery
      ): Promise<readonly [string, HistogramBoundsResult] | undefined> => {
        try {
          const {
            documents: [row],
          } = await executeEsqlQuery<BoundsRow>({
            esqlQuery: boundsQuery.esqlQuery,
            search: searchRef.current,
            signal,
            timeFieldName: currentDataSource.timeFieldName,
            timeRange: relativeTimeRangeRef.current,
            filters: filtersRef.current ?? [],
            variables: esqlVariablesRef.current,
            uiSettings: uiSettingsRef.current,
            profileId: profileIdRef.current,
            executionContextName: MetricsExecutionContextName.HISTOGRAM_BOUNDS,
          });
          const bounds = parseHistogramBounds(
            row?.[HISTOGRAM_BOUNDS_MIN_COLUMN],
            row?.[HISTOGRAM_BOUNDS_MAX_COLUMN]
          );
          return bounds ? [boundsQuery.metricKey, bounds] : undefined;
        } catch (error) {
          if (signal.aborted) {
            return undefined;
          }
          failures.push({ error, boundsQuery });
          return [boundsQuery.metricKey, { error: toError(error) }];
        }
      };

      return Promise.all(currentQueries.map(fetchBounds)).then((entries) => {
        if (signal.aborted) {
          return EMPTY_BOUNDS;
        }
        if (failures.length > 0) {
          reportBatchFailure(failures);
        }
        return new Map(entries.filter(isBoundsEntry));
      });
    },
    [
      requestKey,
      queriesRef,
      enabledRef,
      dataSourceRef,
      relativeTimeRangeRef,
      filtersRef,
      esqlVariablesRef,
      searchRef,
      uiSettingsRef,
      profileIdRef,
      reportErrorRef,
      trackEsqlQueryFailureRef,
    ]
  );

  return { loading, bounds: value ?? EMPTY_BOUNDS };
};
