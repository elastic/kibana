/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
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
  classifyHistogramBounds,
  type RawHistogramBound,
} from '../../../../common/utils/classify_histogram_bounds';
import { useTelemetry } from '../../../../context/ebt_telemetry_context';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from '../utils/execution_context_enums';
import { buildEsqlQueryFailureEvent } from '../telemetry/build_esql_query_failure_event';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';

export type HistogramBoundsByMetricKey = ReadonlyMap<string, HistogramBoundsResult>;

/**
 * `idle`: nothing to fetch. `loading`: requests in flight, `bounds` is empty.
 * `ready`: every chart on the page has settled, including per-chart errors.
 */
export interface HistogramBoundsState {
  readonly status: 'idle' | 'loading' | 'ready';
  readonly bounds: HistogramBoundsByMetricKey;
}

type BoundsRow = Record<string, RawHistogramBound>;

const EMPTY_BOUNDS: HistogramBoundsByMetricKey = new Map();
const IDLE_STATE: HistogramBoundsState = { status: 'idle', bounds: EMPTY_BOUNDS };
const LOADING_STATE: HistogramBoundsState = { status: 'loading', bounds: EMPTY_BOUNDS };

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Fetches raw MIN/MAX bounds for each histogram chart on the visible page, one request per chart.
 * Results are keyed by `getMetricUniqueKey` and published together once every request settles.
 * Sends nothing when `enabled` is false.
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
  fetchParams: ChartSectionProps['fetchParams'];
  services: ChartSectionProps['services'];
  whereStatements: readonly string[];
  originalSource?: string;
  profileId: string;
}): HistogramBoundsState => {
  const reportError = useReportChartSectionError();
  const { trackEsqlQueryFailure } = useTelemetry();
  const [state, setState] = useState<HistogramBoundsState>(IDLE_STATE);

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
  const { dataView, relativeTimeRange, filters, esqlVariables, searchSessionId } = fetchParams;
  const search = services.data.search.search;
  const { uiSettings } = services;

  // Discover replaces `abortController` and bumps `lastReloadRequestTime` on chart-only
  // refetches (breakdown, vis context) that do not change these inputs. Keying on either
  // would send a second MIN/MAX request per chart. A Discover refresh starts a new search
  // session. Query order is ignored so a grid reorder does not refetch.
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        enabled,
        queries: [...queries].sort((left, right) => left.metricKey.localeCompare(right.metricKey)),
        timeFrom: relativeTimeRange?.from ?? null,
        timeTo: relativeTimeRange?.to ?? null,
        filters: filters ?? [],
        variables: esqlVariables ?? [],
        indexPattern: dataView?.getIndexPattern() ?? null,
        searchSessionId: searchSessionId ?? null,
      }),
    [enabled, queries, relativeTimeRange, filters, esqlVariables, dataView, searchSessionId]
  );

  const queriesRef = useLatest(queries);
  const enabledRef = useLatest(enabled);
  const dataViewRef = useLatest(dataView);
  const relativeTimeRangeRef = useLatest(relativeTimeRange);
  const filtersRef = useLatest(filters);
  const esqlVariablesRef = useLatest(esqlVariables);
  const searchRef = useLatest(search);
  const uiSettingsRef = useLatest(uiSettings);
  const profileIdRef = useLatest(profileId);
  const reportErrorRef = useLatest(reportError);
  const trackEsqlQueryFailureRef = useLatest(trackEsqlQueryFailure);

  useEffect(() => {
    const currentQueries = queriesRef.current;
    const currentDataView = dataViewRef.current;
    if (!enabledRef.current || currentQueries.length === 0 || !currentDataView) {
      setState(IDLE_STATE);
      return;
    }

    setState(LOADING_STATE);

    const controller = new AbortController();
    const { signal } = controller;

    const reportFailure = (error: unknown, { metricKey, esqlQuery }: HistogramBoundsQuery) => {
      reportErrorRef.current({
        error,
        source: 'useFetchHistogramBounds',
        labels: {
          page: `metrics_${MetricsExecutionContextAction.FETCH}_${MetricsExecutionContextName.HISTOGRAM_BOUNDS}`,
          profile_id: profileIdRef.current,
          chart_id: metricKey,
        },
      });

      const failureEvent = buildEsqlQueryFailureEvent({ error, esqlQuery });
      if (failureEvent) {
        trackEsqlQueryFailureRef.current(failureEvent);
      }
    };

    const fetchBounds = async (
      boundsQuery: HistogramBoundsQuery
    ): Promise<readonly [string, HistogramBoundsResult]> => {
      try {
        const {
          documents: [row],
        } = await executeEsqlQuery<BoundsRow>({
          esqlQuery: boundsQuery.esqlQuery,
          search: searchRef.current,
          signal,
          dataView: currentDataView,
          timeRange: relativeTimeRangeRef.current,
          filters: filtersRef.current ?? [],
          variables: esqlVariablesRef.current,
          uiSettings: uiSettingsRef.current,
          profileId: profileIdRef.current,
          executionContextName: MetricsExecutionContextName.HISTOGRAM_BOUNDS,
        });
        return [
          boundsQuery.metricKey,
          classifyHistogramBounds(
            row?.[HISTOGRAM_BOUNDS_MIN_COLUMN],
            row?.[HISTOGRAM_BOUNDS_MAX_COLUMN]
          ),
        ];
      } catch (error) {
        if (!signal.aborted) {
          reportFailure(error, boundsQuery);
        }
        return [boundsQuery.metricKey, { status: 'error', error: toError(error) }];
      }
    };

    Promise.all(currentQueries.map(fetchBounds)).then((entries) => {
      if (signal.aborted) {
        return;
      }
      setState({ status: 'ready', bounds: new Map(entries) });
    });

    return () => {
      controller.abort();
    };
  }, [
    requestKey,
    queriesRef,
    enabledRef,
    dataViewRef,
    relativeTimeRangeRef,
    filtersRef,
    esqlVariablesRef,
    searchRef,
    uiSettingsRef,
    profileIdRef,
    reportErrorRef,
    trackEsqlQueryFailureRef,
  ]);

  return state;
};
