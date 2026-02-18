/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { UnifiedMetricsExperienceGrid } from '@kbn/unified-chart-section-viewer';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';
import type { ChartSectionConfigurationExtensionParams } from '../../../../types';
import type { DiscoverAppState } from '../../../../../application/main/state_management/redux';
import type { DataSourceProfileProvider } from '../../../../profiles';

/**
 * Wrapper component that reads breakdownField from Discover's app state
 * and passes it to UnifiedMetricsExperienceGrid for syncing with dimensions selector
 */
const MetricsExperienceGridWrapper = (
  props: ChartSectionProps & { actions: ChartSectionConfigurationExtensionParams['actions'] }
) => {
  const breakdownField = useAppStateSelector((state: DiscoverAppState) => state.breakdownField);
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const { onFilter } = props;

  // This will prevent the filter being added to the query for multi-dimensional breakdowns when the user clicks on a data point on the series.
  const handleFilter = useCallback(
    (event: ExpressionRendererEvent['data']) => {
      if (onFilter) {
        onFilter(event);
      }
      event.preventDefault();
    },
    [onFilter]
  );

  const onBreakdownFieldChange = useCallback(
    (nextBreakdownField?: string) => {
      dispatch(updateAppState({ appState: { breakdownField: nextBreakdownField } }));
    },
    [dispatch, updateAppState]
  );

  return (
    <UnifiedMetricsExperienceGrid
      {...props}
      onFilter={handleFilter}
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
