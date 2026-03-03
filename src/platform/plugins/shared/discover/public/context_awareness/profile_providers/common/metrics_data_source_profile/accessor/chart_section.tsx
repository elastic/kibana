/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { UnifiedMetricsExperienceGrid } from '@kbn/unified-chart-section-viewer';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';
import type { ChartSectionConfigurationExtensionParams } from '../../../../types';
import type { DiscoverAppState } from '../../../../../application/main/state_management/redux';
import type { DataSourceProfileProvider } from '../../../../profiles';
import { buildMetricsInfoQuery } from '../utils/append_metrics_info';
import { fetchMetricsInfo } from '../utils/fetch_metrics_info';

/**
 * Triggers a METRICS_INFO fetch when in Metrics Experience (non-transformational ES|QL, chart visible).
 * Inlined here as it is only used by this chart section.
 */
function useMetricsInfoFetch(
  fetchParams: ChartSectionProps['fetchParams'],
  services: ChartSectionProps['services'],
  isComponentVisible: boolean
): void {
  const esql =
    fetchParams.query && 'esql' in fetchParams.query ? fetchParams.query.esql : undefined;
  const shouldFetch =
    isComponentVisible && !!esql && !!fetchParams.isESQLQuery && !hasTransformationalCommand(esql);

  useEffect(() => {
    if (!shouldFetch || !fetchParams.dataView) {
      return;
    }
    const metricsInfoQuery = buildMetricsInfoQuery(esql);
    if (!metricsInfoQuery) {
      return;
    }
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
    }).catch(() => {});
  }, [
    shouldFetch,
    esql,
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
}

/**
 * Wrapper component that reads breakdownField from Discover's app state
 * and passes it to UnifiedMetricsExperienceGrid for syncing with dimensions selector.
 * Triggers METRICS_INFO fetch when in Metrics Experience.
 */
const MetricsExperienceGridWrapper = (
  props: ChartSectionProps & { actions: ChartSectionConfigurationExtensionParams['actions'] }
) => {
  const breakdownField = useAppStateSelector((state: DiscoverAppState) => state.breakdownField);
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);

  useMetricsInfoFetch(props.fetchParams, props.services, props.isComponentVisible ?? true);

  const onBreakdownFieldChange = useCallback(
    (nextBreakdownField?: string) => {
      dispatch(updateAppState({ appState: { breakdownField: nextBreakdownField } }));
    },
    [dispatch, updateAppState]
  );

  return (
    <UnifiedMetricsExperienceGrid
      {...props}
      actions={props.actions}
      breakdownField={breakdownField}
      onBreakdownFieldChange={onBreakdownFieldChange}
    />
  );
};

export const createChartSection =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        return <MetricsExperienceGridWrapper {...props} actions={params.actions} />;
      },
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      defaultTopPanelHeight: 'max-content',
    };
  };
