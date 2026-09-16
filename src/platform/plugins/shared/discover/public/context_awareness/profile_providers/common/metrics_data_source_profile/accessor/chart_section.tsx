/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useObservable } from '@kbn/use-observable';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { MetricsGridSettings } from '@kbn/discover-utils';
import { UnifiedMetricsExperienceGrid } from '@kbn/unified-chart-section-viewer';
import type { MetricsSort } from '@kbn/unified-chart-section-viewer';
import { useAppStateSelector } from '../../../../../application/main/state_management/redux';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import type { DiscoverAppState } from '../../../../../application/main/state_management/redux';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { ContextAwarenessToolkitActions } from '../../../../toolkit';
import type { ProfileStateAdapter } from '../../../..';
import { METRICS_STATE_DEF, type MetricsState } from '../../../../../../common/context_awareness';
import { METRICS_DATA_SOURCE_PROFILE_ID } from '../profile';
import { RecentMetricsStorage } from './recent_metrics_storage';
/**
 * Wrapper component that reads breakdownField from Discover's app state
 * and passes it to UnifiedMetricsExperienceGrid for syncing with dimensions selector.
 */
const MetricsExperienceGridWrapper = (
  props: ChartSectionProps & {
    actions: ContextAwarenessToolkitActions;
    metricsStateAdapter: ProfileStateAdapter<MetricsState>;
  }
) => {
  const { metricsStateAdapter } = props;
  const breakdownField = useAppStateSelector((state: DiscoverAppState) => state.breakdownField);
  const { discoverShared, dataViews, notifications, docLinks, logger, core, storage } =
    useDiscoverServices();

  const metricsState = useObservable(
    metricsStateAdapter.getState$(),
    metricsStateAdapter.getState()
  );

  const gridSettings = useMemo<MetricsGridSettings>(
    () => ({
      counterAggregation: metricsState.counterAggregation,
      gaugeAggregation: metricsState.gaugeAggregation,
      histogramPercentile: metricsState.histogramPercentile,
      dimensions: metricsState.dimensions,
      searchTerm: metricsState.searchTerm,
    }),
    [
      metricsState.counterAggregation,
      metricsState.gaugeAggregation,
      metricsState.histogramPercentile,
      metricsState.dimensions,
      metricsState.searchTerm,
    ]
  );

  const onGridSettingsChange = useCallback(
    (update: Partial<MetricsGridSettings>) => {
      metricsStateAdapter.updateState(update);
    },
    [metricsStateAdapter]
  );

  const metricsSort = useMemo<MetricsSort>(
    () => ({
      sortField: metricsState.sortField,
      sortDirection: metricsState.sortDirection,
    }),
    [metricsState.sortField, metricsState.sortDirection]
  );

  const onMetricsSortChange = useCallback(
    (next: MetricsSort) => {
      metricsStateAdapter.updateState(next);
    },
    [metricsStateAdapter]
  );

  const recentMetricsStorage = useMemo(
    () => new RecentMetricsStorage(core.http.basePath.get(), storage),
    [core.http.basePath, storage]
  );

  const getRecentlyExploredMetrics = useCallback(
    () => recentMetricsStorage.get(),
    [recentMetricsStorage]
  );

  const onMetricExplored = useCallback(
    (metricUniqueKey: string) => recentMetricsStorage.add(metricUniqueKey),
    [recentMetricsStorage]
  );

  const externalServices = useMemo(
    () => ({
      discoverShared,
      dataViews,
      notifications,
      docLinks,
      logger: logger.get(METRICS_DATA_SOURCE_PROFILE_ID),
      featureFlags: core.featureFlags,
    }),
    [discoverShared, dataViews, notifications, docLinks, logger, core.featureFlags]
  );

  return (
    <UnifiedMetricsExperienceGrid
      {...props}
      actions={props.actions}
      profileId={METRICS_DATA_SOURCE_PROFILE_ID}
      breakdownField={breakdownField}
      externalServices={externalServices}
      gridSettings={gridSettings}
      onGridSettingsChange={onGridSettingsChange}
      metricsSort={metricsSort}
      onMetricsSortChange={onMetricsSortChange}
      getRecentlyExploredMetrics={getRecentlyExploredMetrics}
      onMetricExplored={onMetricExplored}
    />
  );
};

export const createChartSection =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev, { toolkit }) =>
  () => {
    const metricsStateAdapter = toolkit.getStateAdapter(METRICS_STATE_DEF);
    return {
      ...prev(),
      renderChartSection: (props) => {
        return (
          <MetricsExperienceGridWrapper
            {...props}
            actions={toolkit.actions}
            metricsStateAdapter={metricsStateAdapter}
          />
        );
      },
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      defaultTopPanelHeight: 'max-content',
    };
  };
