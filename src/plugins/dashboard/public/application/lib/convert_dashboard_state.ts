/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DashboardContainerInput } from '../embeddable';
import { DashboardSavedObject } from '../../saved_dashboards';
import { EmbeddablePackageState, ViewMode } from '../../services/embeddable';
import { convertSavedDashboardPanelToPanelState } from '../../../common/embeddable/embeddable_saved_object_converters';
import {
  DashboardAppServices,
  DashboardPanelMap,
  DashboardState,
  SavedDashboardPanel,
} from '../../types';
import { getTagsFromSavedDashboard, migrateAppState } from '.';

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

export const savedObjectToDashboardState = ({
  version,
  hideWriteControls,
  savedDashboard,
  usageCollection,
  savedObjectsTagging,
}: SavedObjectToDashboardStateProps) => {
  return migrateAppState(
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

  const panels: DashboardPanelMap = {};
  dashboardState.panels?.forEach((panel: SavedDashboardPanel) => {
    panels[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
  });

  return {
    refreshConfig: queryService.timefilter.timefilter.getRefreshInterval(),
    hidePanelTitles: dashboardState.options?.hidePanelTitles,
    isFullScreenMode: dashboardState.fullScreenMode,
    expandedPanelId: dashboardState.expandedPanelId,
    useMargins: dashboardState.options?.useMargins,
    syncColors: dashboardState.options?.syncColors,
    description: dashboardState.description,
    viewMode: dashboardState.viewMode,
    filters: dashboardState.filters,
    id: savedDashboard.id || '',
    query: dashboardState.query,
    title: dashboardState.title,
    dashboardCapabilities,
    isEmbeddedExternally,
    searchSessionId,
    panels,
    timeRange: {
      ..._.cloneDeep(queryService.timefilter.timefilter.getTime()),
    },
  };
};
