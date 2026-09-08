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
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { buildMetricsInfoQuery, escapeStringValue } from '@kbn/esql-utils';
import { isFilterDisabled, type Filter } from '@kbn/es-query';
import { getFieldIconType } from '@kbn/field-utils';
import type { Dimension, MetricsESQLResponse, MetricsInfo, ParsedMetrics } from '../../../../types';
import {
  buildJoinedFilter,
  dropWhereCommands,
  keepMetricsPresentInBoth,
} from '../../../../common/utils';
import { useTelemetry } from '../../../../context/ebt_telemetry_context';
import { useChartSectionInspector } from '../../../../context/chart_section_inspector';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { parseMetricsWithTelemetry } from '../utils/parse_metrics_response_with_telemetry';
import { telemetryFromMetricItems } from '../utils/telemetry_from_metric_items';
import { getEsqlQuery } from '../utils/get_esql_query';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from '../utils/execution_context_enums';
import {
  GRID_OF_METRICS_REQUEST,
  METRICS_WITH_DATA_REQUEST,
} from '../utils/metrics_inspector_requests';
import { useReportChartSectionError } from '../../../chart/hooks/use_report_chart_section_error';

const hasEnabledDiscoverFilters = (filters: Filter[] | undefined): boolean =>
  Boolean(filters?.some((filter) => !isFilterDisabled(filter)));

/**
 * Fetches METRICS_INFO for the metrics grid.
 *
 * Capability (`Grid of metrics`): when a dimension is selected, every WHERE
 * command is dropped, Discover filter pills are omitted (time range stays),
 * then METRICS_INFO + MV_CONTAINS. This is also the source of the dimension
 * dropdown.
 *
 * Membership (`Metrics with data`): the full user query + METRICS_INFO + pills,
 * names only. Run when dropping WHERE changed the query, or when pills remain
 * after a dimension is selected.
 *
 * Cards = capability ∩ membership.
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
  const { resetRequests, trackRequest } = useChartSectionInspector();
  const reportError = useReportChartSectionError();
  const esql = getEsqlQuery(fetchParams.query);
  const dataView = fetchParams.dataView;

  const appliedDimensions = useMemo(() => {
    if (!selectedDimensionNames?.length || !dataView) {
      return selectedDimensionNames;
    }
    return selectedDimensionNames.filter((dimension) => dataView.getFieldByName(dimension.name));
  }, [selectedDimensionNames, dataView]);

  const appliedDimensionNames = useMemo(
    () => appliedDimensions?.map((dimension) => dimension.name),
    [appliedDimensions]
  );

  const capabilitySourceQuery = useMemo(() => {
    if (!appliedDimensionNames?.length) {
      return esql;
    }
    return dropWhereCommands(esql);
  }, [esql, appliedDimensionNames]);

  const declaredDimensionFilter = useMemo(
    () =>
      buildJoinedFilter(
        appliedDimensionNames,
        (dimension) => `MV_CONTAINS(dimension_fields, ${escapeStringValue(dimension)})`
      ),
    [appliedDimensionNames]
  );

  const capabilityQuery = useMemo(
    () =>
      buildMetricsInfoQuery(
        capabilitySourceQuery,
        declaredDimensionFilter ? { postFilter: declaredDimensionFilter } : undefined
      ),
    [capabilitySourceQuery, declaredDimensionFilter]
  );

  const membershipQuery = useMemo(() => {
    if (!esql || !appliedDimensionNames?.length) {
      return '';
    }
    const whereDropped = capabilitySourceQuery !== esql;
    if (!whereDropped && !hasEnabledDiscoverFilters(fetchParams.filters)) {
      return '';
    }
    return buildMetricsInfoQuery(esql);
  }, [esql, capabilitySourceQuery, appliedDimensionNames, fetchParams.filters]);

  const shouldFetch = isComponentVisible && !!capabilityQuery;

  const [{ value, error, loading }, executeFetch] = useAsyncFn(
    async (
      signal: AbortSignal
    ): Promise<(ParsedMetrics & { activeDimensions: Dimension[] }) | null> => {
      const metricsDataView = fetchParams.dataView;
      if (!metricsDataView) {
        return null;
      }

      signal.throwIfAborted();
      resetRequests();

      const discoverFilters = fetchParams.filters ?? [];
      const capabilityFilters = appliedDimensionNames?.length ? [] : discoverFilters;

      const runMetricsInfo = async (
        name: string,
        description: string,
        esqlQuery: string,
        filters: Filter[]
      ) => {
        signal.throwIfAborted();
        return trackRequest(name, description, async () => {
          const { documents, rawResponse, requestParams } =
            await executeEsqlQuery<MetricsESQLResponse>({
              esqlQuery,
              search: services.data.search.search,
              signal,
              dataView: metricsDataView,
              timeRange: fetchParams.timeRange,
              filters,
              variables: fetchParams.esqlVariables,
              uiSettings: services.uiSettings,
              profileId,
            });

          return {
            data: documents,
            request: requestParams,
            response: rawResponse,
          };
        });
      };

      const getFieldType = (name: string) => {
        const field = fetchParams.dataView?.getFieldByName(name);
        return field ? getFieldIconType(field) : undefined;
      };

      const capableDocuments = await runMetricsInfo(
        GRID_OF_METRICS_REQUEST,
        'This request lists metrics that declare the selected dimensions.',
        capabilityQuery,
        capabilityFilters
      );

      signal.throwIfAborted();

      const capable = parseMetricsWithTelemetry(capableDocuments, getFieldType);

      const withDataDocuments = membershipQuery
        ? await runMetricsInfo(
            METRICS_WITH_DATA_REQUEST,
            'This request lists metrics that have data under the current query.',
            membershipQuery,
            discoverFilters
          )
        : undefined;

      signal.throwIfAborted();

      const metricItems = withDataDocuments
        ? keepMetricsPresentInBoth(
            capable.metricItems,
            parseMetricsWithTelemetry(withDataDocuments, getFieldType).metricItems
          )
        : capable.metricItems;

      const telemetry = telemetryFromMetricItems(metricItems);

      if (!signal.aborted) {
        trackMetricsInfo(telemetry);
      }

      return {
        metricItems,
        allDimensions: [...capable.allDimensions].sort((a, b) => a.name.localeCompare(b.name)),
        activeDimensions: appliedDimensions ?? [],
      };
    },
    [
      capabilityQuery,
      membershipQuery,
      resetRequests,
      trackRequest,
      fetchParams.dataView,
      fetchParams.timeRange,
      fetchParams.filters,
      fetchParams.esqlVariables,
      services.data.search.search,
      services.uiSettings,
      trackMetricsInfo,
      appliedDimensions,
      appliedDimensionNames,
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

  useEffect(() => {
    if (!error) {
      return;
    }
    reportError({
      error,
      source: 'useFetchMetricsData',
      labels: {
        page: `metrics_${MetricsExecutionContextAction.FETCH}_${MetricsExecutionContextName.METRICS_INFO}`,
        profile_id: profileId,
      },
    });
  }, [error, profileId, reportError]);

  const isInitialState = !loading && !value && !error;
  const isPendingResponse = isComponentVisible && isInitialState;

  return {
    loading: loading || isPendingResponse,
    error: error ?? null,
    metricItems: value?.metricItems ?? [],
    allDimensions: value?.allDimensions ?? [],
    activeDimensions: value?.activeDimensions ?? [],
  };
}
