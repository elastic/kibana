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

import { DashboardPanelState } from 'plugins/dashboard_embeddable';
import chrome from 'ui/chrome';
import { SavedDashboardPanel, Pre61SavedDashboardPanel } from '../types';
import { parseVersion, convertPanelDataPre63, convertPanelDataPre61 } from '../panel/panel_utils';

export function convertSavedDashboardPanelToPanelState(
  savedDashboardPanel: SavedDashboardPanel | Pre61SavedDashboardPanel,
  useMargins: boolean
): DashboardPanelState {
  // panel version numbers added in 6.1. Any panel without version number is assumed to be 6.0.0
  const panelVersion =
    'version' in savedDashboardPanel
      ? parseVersion(savedDashboardPanel.version)
      : parseVersion('6.0.0');

  let panel: SavedDashboardPanel;
  if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 1)) {
    panel = convertPanelDataPre61(savedDashboardPanel as Pre61SavedDashboardPanel, useMargins);
  } else if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 3)) {
    panel = convertPanelDataPre63(savedDashboardPanel as SavedDashboardPanel, useMargins);
  } else {
    panel = savedDashboardPanel as SavedDashboardPanel;
  }

  return {
    type: savedDashboardPanel.type,
    gridData: panel.gridData,
    embeddableId: savedDashboardPanel.panelIndex,
    ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
    explicitInput: {
      ...(panel.title !== undefined && { title: panel.title }),
      ...panel.embeddableConfig,
    },
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelState: DashboardPanelState
): SavedDashboardPanel {
  const customTitle: string | undefined = panelState.explicitInput.title
    ? (panelState.explicitInput.title as string)
    : undefined;
  return {
    version: chrome.getKibanaVersion(),
    type: panelState.type,
    gridData: panelState.gridData,
    panelIndex: panelState.embeddableId,
    embeddableConfig: panelState.explicitInput,
    ...(customTitle && { title: customTitle }),
    ...(panelState.savedObjectId !== undefined && { id: panelState.savedObjectId }),
  };
}
