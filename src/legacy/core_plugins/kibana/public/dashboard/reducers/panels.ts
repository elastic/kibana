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

import _ from 'lodash';
import { Reducer } from 'redux';
import { PanelActions, PanelActionTypeKeys, SetPanelTitleActionPayload } from '../actions';
import { PanelId } from '../selectors';
import { SavedDashboardPanel } from '../types';

interface PanelStateMap {
  [key: string]: SavedDashboardPanel;
}

const deletePanel = (panels: PanelStateMap, panelId: PanelId): PanelStateMap => {
  const panelsCopy = { ...panels };
  delete panelsCopy[panelId];
  return panelsCopy;
};

const updatePanel = (panels: PanelStateMap, panelState: SavedDashboardPanel): PanelStateMap => ({
  ...panels,
  [panelState.panelIndex]: panelState,
});

const updatePanels = (panels: PanelStateMap, updatedPanels: PanelStateMap): PanelStateMap => {
  const panelsCopy = { ...panels };
  Object.values(updatedPanels).forEach(panel => {
    panelsCopy[panel.panelIndex] = panel;
  });
  return panelsCopy;
};

const resetPanelTitle = (panels: PanelStateMap, panelId: PanelId) => ({
  ...panels,
  [panelId]: {
    ...panels[panelId],
    title: undefined,
  },
});

const setPanelTitle = (panels: PanelStateMap, payload: SetPanelTitleActionPayload) => ({
  ...panels,
  [payload.panelId]: {
    ...panels[payload.panelId],
    title: payload.title,
  },
});

const setPanels = ({}, newPanels: PanelStateMap) => _.cloneDeep(newPanels);

export const panelsReducer: Reducer<PanelStateMap> = (panels = {}, action): PanelStateMap => {
  switch ((action as PanelActions).type) {
    case PanelActionTypeKeys.DELETE_PANEL:
      return deletePanel(panels, action.payload);
    case PanelActionTypeKeys.UPDATE_PANEL:
      return updatePanel(panels, action.payload);
    case PanelActionTypeKeys.UPDATE_PANELS:
      return updatePanels(panels, action.payload);
    case PanelActionTypeKeys.RESET_PANEL_TITLE:
      return resetPanelTitle(panels, action.payload);
    case PanelActionTypeKeys.SET_PANEL_TITLE:
      return setPanelTitle(panels, action.payload);
    case PanelActionTypeKeys.SET_PANELS:
      return setPanels(panels, action.payload);
    default:
      return panels;
  }
};
