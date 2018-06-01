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
import _ from 'lodash';

import {
  updatePanel
} from './panels';

import {
  getPanel,
  getEmbeddableCustomization,
} from '../../selectors/dashboard_selectors';

export const embeddableIsInitializing = createAction('EMBEDDABLE_IS_INITIALIZING');
export const embeddableIsInitialized = createAction('EMBEDDABLE_INITIALIZED');
export const setStagedFilter = createAction('SET_STAGED_FILTER');
export const clearStagedFilters = createAction('CLEAR_STAGED_FILTERS');
export const embeddableError = createAction('EMBEDDABLE_ERROR');

/**
 * The main point of communication from the embeddable to the dashboard. Any time state in the embeddable
 * changes, this function will be called. The data is then extracted from EmbeddableState and stored in
 * redux so the appropriate actions are taken and UI updated.

 * @param {string} panelId - the id of the panel whose state has changed.
 * @param {EmbeddableState} embeddableState - the new state of the embeddable.
 */
export function embeddableStateChanged({ panelId, embeddableState }) {
  return (dispatch, getState) => {
    // Translate embeddableState to things redux cares about.
    const customization = getEmbeddableCustomization(getState(), panelId);
    if (!_.isEqual(embeddableState.customization, customization)) {
      const panel = getPanel(getState(), panelId);
      dispatch(updatePanel({ ...panel, embeddableConfig: _.cloneDeep(embeddableState.customization) }));
    }

    if (embeddableState.stagedFilter) {
      dispatch(setStagedFilter({ stagedFilter: embeddableState.stagedFilter, panelId }));
    }
  };
}

