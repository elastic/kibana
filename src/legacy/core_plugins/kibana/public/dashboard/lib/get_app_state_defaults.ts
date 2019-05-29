/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ViewMode } from 'plugins/embeddable_api';
import { FilterUtils } from './filter_utils';
import {
  DashboardAppStateDefaults,
  SavedDashboardPanel,
  Pre61SavedDashboardPanel,
  Pre64SavedDashboardPanel,
} from '../types';
import { SavedObjectDashboard } from '../saved_dashboard/saved_dashboard';
import { parseVersion, convertPanelDataPre61, convertPanelDataPre63 } from '../panel/panel_utils';

/**
 * Does not actually convert the panels into the latest format
 * @param savedDashboard
 * @param hideWriteControls
 */
export function getAppStateDefaults(
  savedDashboard: SavedObjectDashboard,
  hideWriteControls: boolean
): DashboardAppStateDefaults {
  const options: {
    useMargins: boolean;
    hidePanelTitles: boolean;
  } = savedDashboard.optionsJSON
    ? JSON.parse(savedDashboard.optionsJSON)
    : { useMargins: true, hidePanelTitles: false };

  const panels: Array<
    SavedDashboardPanel | Pre61SavedDashboardPanel | Pre64SavedDashboardPanel
  > = savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [];

  const convertedPanels: SavedDashboardPanel[] = [];

  const uiState = savedDashboard.uiStateJSON ? JSON.parse(savedDashboard.uiStateJSON) : {};

  panels.forEach(panel => {
    // For BWC in pre 6.1 versions where uiState was stored at the dashboard level, not at the panel level.
    // TODO: introduce a migration for this
    const embeddableConfig = savedDashboard.uiStateJSON
      ? uiState[`P-${panel.panelIndex}`]
      : (panel as SavedDashboardPanel).embeddableConfig;

    // For BWC of pre 6.4 where search embeddables stored state directly on the panel and not under embeddableConfig.
    // TODO: introduce a migration for this
    const pre64Panel = panel as Pre64SavedDashboardPanel;
    if (pre64Panel.columns || pre64Panel.sort) {
      embeddableConfig.columns = pre64Panel.columns;
      embeddableConfig.sort = pre64Panel.sort;
      delete pre64Panel.sort;
      delete pre64Panel.columns;
    }

    // Panel version numbers added in 6.1. Any panel without version number is assumed to be 6.0.0
    const panelVersion = 'version' in panel ? parseVersion(panel.version) : parseVersion('6.0.0');

    let latestPanel: SavedDashboardPanel;
    if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 1)) {
      latestPanel = {
        ...convertPanelDataPre61(panel as Pre61SavedDashboardPanel, options.useMargins),
        embeddableConfig,
      };
    } else if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 3)) {
      latestPanel = convertPanelDataPre63(
        { ...panel, embeddableConfig } as SavedDashboardPanel,
        options.useMargins
      );
    } else {
      latestPanel = { ...panel, embeddableConfig } as SavedDashboardPanel;
    }

    convertedPanels.push(latestPanel);
  });

  delete savedDashboard.uiStateJSON;
  return {
    fullScreenMode: false,
    title: savedDashboard.title,
    description: savedDashboard.description,
    timeRestore: savedDashboard.timeRestore,
    panels: convertedPanels,
    options,
    query: FilterUtils.getQueryFilterForDashboard(savedDashboard),
    filters: FilterUtils.getFilterBarsForDashboard(savedDashboard),
    viewMode: savedDashboard.id || hideWriteControls ? ViewMode.VIEW : ViewMode.EDIT,
  };
}
