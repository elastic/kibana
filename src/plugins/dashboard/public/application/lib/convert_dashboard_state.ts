/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DashboardSavedObject } from '../../saved_dashboards';
import { getTagsFromSavedDashboard, migrateAppState } from '.';
import { EmbeddablePackageState, ViewMode } from '../../services/embeddable';
import {
  convertPanelStateToSavedDashboardPanel,
  convertSavedDashboardPanelToPanelState,
} from '../../../common/embeddable/embeddable_saved_object_converters';
import {
  DashboardState,
  RawDashboardState,
  DashboardPanelMap,
  SavedDashboardPanel,
  DashboardAppServices,
  DashboardContainerInput,
} from '../../types';

interface SavedObjectToDashboardStateProps {
  version: string;
  hideWriteControls: boolean;
  savedDashboard: DashboardSavedObject;
  usageCollection: DashboardAppServices['usageCollection'];
  savedObjectsTagging: DashboardAppServices['savedObjectsTagging'];
}

interface StateToDashboardContainerInputProps {
  searchSessionId?: string;
  isEmbeddedExternally?: boolean;
  services: DashboardAppServices;
  dashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
  incomingEmbeddable?: EmbeddablePackageState;
}

interface StateToRawDashboardStateProps {
  version: string;
  state: DashboardState;
}

export const savedObjectToDashboardState = ({
  version,
  hideWriteControls,
  savedDashboard,
  usageCollection,
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
      viewMode: savedDashboard.id || hideWriteControls ? ViewMode.VIEW : ViewMode.EDIT,
      options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
    },
    version,
    usageCollection
  );

  const panels: DashboardPanelMap = {};
  rawState.panels?.forEach((panel: SavedDashboardPanel) => {
    panels[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
  });
  return { ...rawState, panels };
};

export const stateToDashboardContainerInput = ({
  isEmbeddedExternally,
  searchSessionId,
  savedDashboard,
  dashboardState,
  services,
}: StateToDashboardContainerInputProps): DashboardContainerInput => {
  const {
    dashboardCapabilities,
    data: { query: queryService },
  } = services;

  return {
    refreshConfig: queryService.timefilter.timefilter.getRefreshInterval(),
    hidePanelTitles: dashboardState.options?.hidePanelTitles,
    filters: queryService.filterManager.getFilters(),
    isFullScreenMode: dashboardState.fullScreenMode,
    expandedPanelId: dashboardState.expandedPanelId,
    useMargins: dashboardState.options?.useMargins,
    syncColors: dashboardState.options?.syncColors,
    description: dashboardState.description,
    viewMode: dashboardState.viewMode,
    panels: dashboardState.panels,
    id: savedDashboard.id || '',
    query: dashboardState.query,
    title: dashboardState.title,
    dashboardCapabilities,
    isEmbeddedExternally,
    searchSessionId,
    timeRange: {
      ..._.cloneDeep(queryService.timefilter.timefilter.getTime()),
    },
  };
};

export const stateToRawDashboardState = ({
  version,
  state,
}: StateToRawDashboardStateProps): RawDashboardState => {
  const savedDashboardPanels = Object.values(state.panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, version)
  );
  return { ..._.omit(state, 'panels'), panels: savedDashboardPanels };
};
