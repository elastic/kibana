/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { KibanaExecutionContext } from '@kbn/core/public';
import {
  compareFilters,
  isFilterPinned,
  migrateFilter,
  COMPARE_ALL_OPTIONS,
  type Filter,
} from '@kbn/es-query';
import { EmbeddablePackageState } from '../../services/embeddable';
import { convertPanelStateToSavedDashboardPanel } from '../../../common';
import {
  DashboardState,
  RawDashboardState,
  DashboardContainerInput,
  DashboardBuildContext,
} from '../../types';

interface StateToDashboardContainerInputProps {
  searchSessionId?: string;
  isEmbeddedExternally?: boolean;
  dashboardState: DashboardState;
  query: DashboardBuildContext['query'];
  incomingEmbeddable?: EmbeddablePackageState;
  dashboardCapabilities: DashboardBuildContext['dashboardCapabilities'];
  executionContext?: KibanaExecutionContext;
}

interface StateToRawDashboardStateProps {
  version: string;
  state: DashboardState;
}

/**
 * Converts a dashboard state object to dashboard container input
 */
export const stateToDashboardContainerInput = ({
  dashboardCapabilities,
  isEmbeddedExternally,
  query: queryService,
  searchSessionId,
  dashboardState,
  executionContext,
}: StateToDashboardContainerInputProps): DashboardContainerInput => {
  const { filterManager, timefilter: timefilterService } = queryService;
  const { timefilter } = timefilterService;

  const {
    controlGroupInput,
    expandedPanelId,
    fullScreenMode,
    description,
    options,
    viewMode,
    panels,
    query,
    title,
    timeRestore,
    timeslice,
    filters: dashboardFilters,
  } = dashboardState;

  return {
    refreshConfig: timefilter.getRefreshInterval(),
    filters: filterManager
      .getFilters()
      .filter(
        (filter) =>
          isFilterPinned(filter) ||
          dashboardFilters.some((dashboardFilter) =>
            filtersAreEqual(migrateFilter(_.cloneDeep(dashboardFilter)), filter)
          )
      ),
    isFullScreenMode: fullScreenMode,
    id: dashboardState.savedObjectId ?? '',
    dashboardCapabilities,
    isEmbeddedExternally,
    ...(options || {}),
    controlGroupInput,
    searchSessionId,
    expandedPanelId,
    description,
    viewMode,
    panels,
    query,
    title,
    timeRange: {
      ..._.cloneDeep(timefilter.getTime()),
    },
    timeslice,
    timeRestore,
    executionContext,
  };
};

const filtersAreEqual = (first: Filter, second: Filter) =>
  compareFilters(first, second, { ...COMPARE_ALL_OPTIONS, state: false });

/**
 * Converts a given dashboard state object to raw dashboard state. This is useful for sharing, and session restoration, as
 * they require panels to be formatted as an array.
 */
export const stateToRawDashboardState = ({
  version,
  state,
}: StateToRawDashboardStateProps): RawDashboardState => {
  const savedDashboardPanels = Object.values(state.panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, version)
  );
  return { ..._.omit(state, 'panels'), panels: savedDashboardPanels };
};
