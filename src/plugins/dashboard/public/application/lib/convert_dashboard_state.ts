/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { ControlGroupInput } from '@kbn/controls-plugin/public';
import { DashboardSavedObject } from '../../saved_dashboards';
import { getTagsFromSavedDashboard, migrateAppState } from '.';
import { EmbeddablePackageState, ViewMode } from '../../services/embeddable';
import { TimeRange } from '../../services/data';
import { convertPanelStateToSavedDashboardPanel } from '../../../common/embeddable/embeddable_saved_object_converters';
import {
  DashboardState,
  RawDashboardState,
  DashboardAppServices,
  DashboardContainerInput,
  DashboardBuildContext,
} from '../../types';
import { convertSavedPanelsToPanelMap } from './convert_dashboard_panels';
import { deserializeControlGroupFromDashboardSavedObject } from './dashboard_control_group';

interface SavedObjectToDashboardStateProps {
  version: string;
  showWriteControls: boolean;
  savedDashboard: DashboardSavedObject;
  usageCollection: DashboardAppServices['usageCollection'];
  savedObjectsTagging: DashboardAppServices['savedObjectsTagging'];
}

interface StateToDashboardContainerInputProps {
  searchSessionId?: string;
  isEmbeddedExternally?: boolean;
  dashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
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
 * Converts a dashboard saved object to a dashboard state by extracting raw state from the given Dashboard
 * Saved Object migrating the panel states to the latest version, then converting each panel from a saved
 * dashboard panel to a panel state.
 */
export const savedObjectToDashboardState = ({
  version,
  savedDashboard,
  usageCollection,
  showWriteControls,
  savedObjectsTagging,
}: SavedObjectToDashboardStateProps): DashboardState => {
  const rawState = migrateAppState(
    {
      fullScreenMode: false,
      title: savedDashboard.title,
      query: savedDashboard.getQuery(),
      filters: savedDashboard.getFilters(),
      timeRestore: savedDashboard.timeRestore,
      description: savedDashboard.description || '',
      tags: getTagsFromSavedDashboard(savedDashboard, savedObjectsTagging),
      panels: savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [],
      viewMode: savedDashboard.id || showWriteControls ? ViewMode.EDIT : ViewMode.VIEW,
      options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
    },
    version,
    usageCollection
  );
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
  dashboardCapabilities,
  isEmbeddedExternally,
  query: queryService,
  searchSessionId,
  savedDashboard,
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
  } = dashboardState;

  return {
    refreshConfig: timefilter.getRefreshInterval(),
    filters: filterManager.getFilters(),
    isFullScreenMode: fullScreenMode,
    id: savedDashboard.id || '',
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
    timeRestore,
    executionContext,
  };
};

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
