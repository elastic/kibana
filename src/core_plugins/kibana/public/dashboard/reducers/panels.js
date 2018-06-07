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
import { handleActions } from 'redux-actions';

import {
  deletePanel,
  updatePanel,
  updatePanels,
  setPanels,
  resetPanelTitle,
  setPanelTitle,
} from '../actions';

/**
 *
 * @param panel {PanelState} - new panel data (can be partial data) to merge with possibly existing panel data in
 * the panels mapping.
 * @param panel.panelIndex {String} The new panel data must specify the panelIndex so we know which panel to merge with.
 * @param panels {Object.<string, PanelState>}
 * @return {PanelState} - a new PanelState which has the merged data.
 */
function mergePanelData(panel, panels) {
  return _.defaultsDeep(panel, panels[panel.panelIndex]);
}

export const panels = handleActions({
  [setPanels]:
    /**
     *
     * @param panels {Object.<string, PanelState>}
     * @param payload {Object.<string, PanelState>}
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => _.cloneDeep(payload),

  [updatePanels]:
    /**
     *
     * @param panels {Object.<string, PanelState>}
     * @param payload {Object.<string, PanelState>}
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => {
      const panelsCopy = { ...panels };
      Object.values(payload).forEach(panel => {
        panelsCopy[panel.panelIndex] = mergePanelData(panel, panels);
      });
      return panelsCopy;
    },

  [deletePanel]:
    /**
     *
     * @param panels {Object.<string, PanelState>}
     * @param payload {string} The panelIndex of the panel to delete
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => {
      const panelsCopy = { ...panels };
      delete panelsCopy[payload];
      return panelsCopy;
    },

  [updatePanel]:
    /**
     * @param panels {Object.<string, PanelState>}
     * @param payload {PanelState} The new panel state (is merged with existing).
     * @param payload.panelIndex {string} The id of the panel to update.
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => ({
      ...panels,
      [payload.panelIndex]: mergePanelData(payload, panels),
    }),

  [resetPanelTitle]:
    /**
     * @param panels {Object.<string, PanelState>}
     * @param payload {String} The id of the panel to reset it's title.
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => ({
      ...panels,
      [payload]: {
        ...panels[payload],
        title: undefined,
      }
    }),

  [setPanelTitle]:
    /**
     * @param panels {Object.<string, PanelState>}
     * @param payload {PanelState} The new panel state (is merged with existing).
     * @param payload.panelIndex {String} The id of the panel to reset it's title.
     * @param payload.title {String} The new title to use.
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => ({
      ...panels,
      [payload.panelIndex]: mergePanelData(payload, panels),
    }),
}, {});
