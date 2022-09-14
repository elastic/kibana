/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ControlGroupInput } from '@kbn/controls-plugin/public';
import {
  compareFilters,
  isFilterPinned,
  migrateFilter,
  COMPARE_ALL_OPTIONS,
  type Filter,
} from '@kbn/es-query';
import { type EmbeddablePackageState, ViewMode } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';

import type { DashboardSavedObject } from '../../saved_dashboards';
import { getTagsFromSavedDashboard, migrateAppState } from '.';
import { convertPanelStateToSavedDashboardPanel } from '../../../common/embeddable/embeddable_saved_object_converters';
import type { DashboardState, RawDashboardState, DashboardContainerInput } from '../../types';
import { convertSavedPanelsToPanelMap } from './convert_dashboard_panels';
import { deserializeControlGroupFromDashboardSavedObject } from './dashboard_control_group';
import { pluginServices } from '../../services/plugin_services';

interface SavedObjectToDashboardStateProps {
  savedDashboard: DashboardSavedObject;
}

interface StateToDashboardContainerInputProps {
  searchSessionId?: string;
  isEmbeddedExternally?: boolean;
  dashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
  incomingEmbeddable?: EmbeddablePackageState;
  executionContext?: KibanaExecutionContext;
}

interface StateToRawDashboardStateProps {
  state: DashboardState;
}
/**
 * Converts a dashboard saved object to a dashboard state by extracting raw state from the given Dashboard
 * Saved Object migrating the panel states to the latest version, then converting each panel from a saved
 * dashboard panel to a panel state.
 */
export const savedObjectToDashboardState = ({
  savedDashboard,
}: SavedObjectToDashboardStateProps): DashboardState => {
  const {
    dashboardCapabilities: { showWriteControls },
  } = pluginServices.getServices();

  const rawState = migrateAppState({
    fullScreenMode: false,
    title: savedDashboard.title,
    query: savedDashboard.getQuery(),
    filters: savedDashboard.getFilters(),
    timeRestore: savedDashboard.timeRestore,
    description: savedDashboard.description || '',
    tags: getTagsFromSavedDashboard(savedDashboard),
    panels: savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [],
    viewMode: savedDashboard.id || showWriteControls ? ViewMode.EDIT : ViewMode.VIEW,
    options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
  });

  if (rawState.timeRestore) {
    rawState.timeRange = { from: savedDashboard.timeFrom, to: savedDashboard.timeTo } as TimeRange;
  }
  rawState.controlGroupInput = deserializeControlGroupFromDashboardSavedObject(
    savedDashboard
  ) as ControlGroupInput;
  return { ...rawState, panels: convertSavedPanelsToPanelMap(rawState.panels) };
};

/**
 * Converts a dashboard state object to dashboard container input
 */
export const stateToDashboardContainerInput = ({
  isEmbeddedExternally,
  searchSessionId,
  savedDashboard,
  dashboardState,
  executionContext,
}: StateToDashboardContainerInputProps): DashboardContainerInput => {
  const {
    data: { query: queryService },
  } = pluginServices.getServices();
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
    id: savedDashboard.id || '',
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
  state,
}: StateToRawDashboardStateProps): RawDashboardState => {
  const {
    initializerContext: { kibanaVersion },
  } = pluginServices.getServices();

  const savedDashboardPanels = Object.values(state.panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, kibanaVersion)
  );
  return { ..._.omit(state, 'panels'), panels: savedDashboardPanels };
};
