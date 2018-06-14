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

import { createAction } from 'redux-actions';

export const deletePanel = createAction('DELETE_PANEL');
export const updatePanel = createAction('UPDATE_PANEL');
export const resetPanelTitle = createAction('RESET_PANEl_TITLE');
export const setPanelTitle = createAction('SET_PANEl_TITLE',
  /**
   * @param title {string}
   * @param panelIndex {string}
   */
  (title, panelIndex) => ({ title, panelIndex })
);

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export const updatePanels = createAction('UPDATE_PANELS');

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export const setPanels = createAction('SET_PANELS');
