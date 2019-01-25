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

import { DashboardViewMode } from '../dashboard_view_mode';
import { FilterUtils } from './filter_utils';

export function getAppStateDefaults(savedDashboard, hideWriteControls) {
  const appState = {
    fullScreenMode: false,
    title: savedDashboard.title,
    description: savedDashboard.description,
    timeRestore: savedDashboard.timeRestore,
    panels: savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [],
    options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
    query: FilterUtils.getQueryFilterForDashboard(savedDashboard),
    filters: FilterUtils.getFilterBarsForDashboard(savedDashboard),
    viewMode: savedDashboard.id || hideWriteControls ? DashboardViewMode.VIEW : DashboardViewMode.EDIT,
  };

  // For BWC in pre 6.1 versions where uiState was stored at the dashboard level, not at the panel level.
  // TODO: introduce a migration for this
  if (savedDashboard.uiStateJSON) {
    const uiState = JSON.parse(savedDashboard.uiStateJSON);
    appState.panels.forEach(panel => {
      panel.embeddableConfig = uiState[`P-${panel.panelIndex}`];
    });
    delete savedDashboard.uiStateJSON;
  }

  // For BWC of pre 6.4 where search embeddables stored state directly on the panel and not under embeddableConfig.
  // TODO: introduce a migration for this
  appState.panels.forEach(panel => {
    if (panel.columns || panel.sort) {
      panel.embeddableConfig = {
        ...panel.embeddableConfig,
        columns: panel.columns,
        sort: panel.sort
      };
      delete panel.columns;
      delete panel.sort;
    }
  });


  return appState;
}
