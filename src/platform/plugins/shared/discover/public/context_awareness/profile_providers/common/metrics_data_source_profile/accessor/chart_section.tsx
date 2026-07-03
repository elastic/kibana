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
import type { MetricsAggregationSettings } from '@kbn/unified-chart-section-viewer';
import { UnifiedMetricsExperienceGrid } from '@kbn/unified-chart-section-viewer';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import type { DiscoverAppState } from '../../../../../application/main/state_management/redux';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { ContextAwarenessToolkitActions } from '../../../../toolkit';
import type { ProfileStateAdapter } from '../../../../profile_state';
import { METRICS_AGGREGATION_STATE_DEF } from '../profile_state';
import { METRICS_DATA_SOURCE_PROFILE_ID } from '../profile';
/**
 * Wrapper component that reads breakdownField from Discover's app state
 * and passes it to UnifiedMetricsExperienceGrid for syncing with dimensions selector.
 */
const MetricsExperienceGridWrapper = (
  props: ChartSectionProps & {
    actions: ContextAwarenessToolkitActions;
    aggregationStateAdapter: ProfileStateAdapter<MetricsAggregationSettings>;
  }
) => {
  const { aggregationStateAdapter } = props;
  const breakdownField = useAppStateSelector((state: DiscoverAppState) => state.breakdownField);
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const { discoverShared, dataViews, notifications, docLinks, logger } = useDiscoverServices();

  const aggregationSettings = useObservable(
    aggregationStateAdapter.getState$(),
    aggregationStateAdapter.getState()
  );

  const onAggregationSettingsChange = useCallback(
    (update: Partial<MetricsAggregationSettings>) => {
      aggregationStateAdapter.updateState(update);
    },
    [aggregationStateAdapter]
  );

  const onBreakdownFieldChange = useCallback(
    (nextBreakdownField?: string) => {
      dispatch(updateAppState({ appState: { breakdownField: nextBreakdownField } }));
    },
    [dispatch, updateAppState]
  );

  const externalServices = useMemo(
    () => ({
      discoverShared,
      dataViews,
      notifications,
      docLinks,
      logger: logger.get(METRICS_DATA_SOURCE_PROFILE_ID),
    }),
    [discoverShared, dataViews, notifications, docLinks, logger]
  );

  return (
    <UnifiedMetricsExperienceGrid
      {...props}
      actions={props.actions}
      profileId={METRICS_DATA_SOURCE_PROFILE_ID}
      breakdownField={breakdownField}
      onBreakdownFieldChange={onBreakdownFieldChange}
      externalServices={externalServices}
      aggregationSettings={aggregationSettings}
      onAggregationSettingsChange={onAggregationSettingsChange}
    />
  );
};

export const createChartSection =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev, { toolkit }) =>
  () => {
    const aggregationStateAdapter = toolkit.getStateAdapter(METRICS_AGGREGATION_STATE_DEF);
    return {
      ...prev(),
      renderChartSection: (props) => {
        return (
          <MetricsExperienceGridWrapper
            {...props}
            actions={toolkit.actions}
            aggregationStateAdapter={aggregationStateAdapter}
          />
        );
      },
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      defaultTopPanelHeight: 'max-content',
    };
  };
