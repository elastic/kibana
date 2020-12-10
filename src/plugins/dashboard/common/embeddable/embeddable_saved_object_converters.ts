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
import { omit } from 'lodash';
import { DashboardPanelState, SavedDashboardPanel } from '../types';
import { SavedObjectEmbeddableInput } from '../../../embeddable/common/';

export function convertSavedDashboardPanelToPanelState(
  savedDashboardPanel: SavedDashboardPanel
): DashboardPanelState {
  return {
    type: savedDashboardPanel.type,
    gridData: savedDashboardPanel.gridData,
    explicitInput: {
      id: savedDashboardPanel.panelIndex,
      ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
      ...(savedDashboardPanel.title !== undefined && { title: savedDashboardPanel.title }),
      ...savedDashboardPanel.embeddableConfig,
    },
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelState: DashboardPanelState,
  version: string
): SavedDashboardPanel {
  const customTitle: string | undefined = panelState.explicitInput.title
    ? (panelState.explicitInput.title as string)
    : undefined;
  const savedObjectId = (panelState.explicitInput as SavedObjectEmbeddableInput).savedObjectId;
  return {
    version,
    type: panelState.type,
    gridData: panelState.gridData,
    panelIndex: panelState.explicitInput.id,
    embeddableConfig: omit(panelState.explicitInput, ['id', 'savedObjectId', 'title']),
    ...(customTitle && { title: customTitle }),
    ...(savedObjectId !== undefined && { id: savedObjectId }),
  };
}
