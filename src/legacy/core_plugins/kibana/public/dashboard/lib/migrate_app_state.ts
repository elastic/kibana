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

import { AppState } from 'ui/state_management/app_state';
import {
  convertPanelDataPre_6_1,
  convertPanelDataPre_6_3,
  parseVersion,
} from '../panel/panel_utils';
import { Pre61SavedDashboardPanel, SavedDashboardPanel } from '../types';

/**
 * Creates a new instance of AppState based of the saved dashboard.
 *
 * @param appState {AppState} AppState class to instantiate
 */
export function migrateAppState(appState: AppState) {
  // For BWC in pre 6.1 versions where uiState was stored at the dashboard level, not at the panel level.
  if (appState.uiState) {
    appState.panels = appState.panels.map(
      (panel: SavedDashboardPanel | Pre61SavedDashboardPanel) => {
        // Panel version numbers added in 6.1. Any panel without version number is assumed to be 6.0.0
        const panelVersion =
          'version' in panel ? parseVersion(panel.version) : parseVersion('6.0.0');

        if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 1)) {
          return {
            ...convertPanelDataPre_6_1(panel as Pre61SavedDashboardPanel),
            embeddableConfig: appState.uiState[`P-${panel.panelIndex}`],
          };
        }

        if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 3)) {
          return {
            ...convertPanelDataPre_6_3(panel as SavedDashboardPanel, appState.useMargins),
            embeddableConfig: appState.uiState[`P-${panel.panelIndex}`],
          };
        }

        return panel;
      }
    );
    delete appState.uiState;
    appState.save();
  }
}
