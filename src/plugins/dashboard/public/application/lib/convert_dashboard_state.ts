/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';

import type { KibanaExecutionContext } from '@kbn/core/public';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { type EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { Filter, isFilterPinned, compareFilters, COMPARE_ALL_OPTIONS } from '@kbn/es-query';

import { pluginServices } from '../../services/plugin_services';
import { convertPanelStateToSavedDashboardPanel } from '../../../common';
import type { DashboardState, RawDashboardState, DashboardContainerInput } from '../../types';

interface StateToDashboardContainerInputProps {
  searchSessionId?: string;
  isEmbeddedExternally?: boolean;
  dashboardState: DashboardState;
  incomingEmbeddable?: EmbeddablePackageState;
  executionContext?: KibanaExecutionContext;
}

interface StateToRawDashboardStateProps {
  state: Partial<DashboardState>;
}

/**
 * Converts a dashboard state object to dashboard container input
 */
export const stateToDashboardContainerInput = ({
  isEmbeddedExternally,
  searchSessionId,
  dashboardState,
  executionContext,
}: StateToDashboardContainerInputProps): DashboardContainerInput => {
  const {
    data: {
      query: { filterManager, timefilter: timefilterService },
    },
  } = pluginServices.getServices();
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

  const migratedDashboardFilters = mapAndFlattenFilters(cloneDeep(dashboardFilters));
  return {
    refreshConfig: timefilter.getRefreshInterval(),
    filters: filterManager
      .getFilters()
      .filter(
        (filter) =>
          isFilterPinned(filter) ||
          migratedDashboardFilters.some((dashboardFilter) =>
            filtersAreEqual(dashboardFilter, filter)
          )
      ),
    isFullScreenMode: fullScreenMode,
    id: dashboardState.savedObjectId ?? '',
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
      ...cloneDeep(timefilter.getTime()),
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
  state,
}: StateToRawDashboardStateProps): Partial<RawDashboardState> => {
  const {
    initializerContext: { kibanaVersion },
  } = pluginServices.getServices();

  const savedDashboardPanels = state?.panels
    ? Object.values(state.panels).map((panel) =>
        convertPanelStateToSavedDashboardPanel(panel, kibanaVersion)
      )
    : undefined;
  return { ...state, panels: savedDashboardPanels };
};
