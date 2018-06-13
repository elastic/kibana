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
import { Action, Dispatch } from 'redux';
import { createAction } from 'redux-actions';
import { CoreKibanaState } from '../../selectors';
import { PanelId, PanelState } from '../selectors';
import { updatePanel } from './panels';

import { EmbeddableMetadata, EmbeddableState } from 'ui/embeddable';
import {
  getEmbeddableCustomization,
  getPanel,
} from '../../selectors/dashboard_selectors';

export type EmbeddableIsInitializingActionPayload = string;

export enum EmbeddableActionTypeKeys {
  EMBEDDABLE_IS_INITIALIZING = 'EMBEDDABLE_IS_INITIALIZING',
  EMBEDDABLE_IS_INITIALIZED = 'EMBEDDABLE_IS_INITIALIZED',
  SET_STAGED_FILTER = 'SET_STAGED_FILTER',
  CLEAR_STAGED_FILTERS = 'CLEAR_STAGED_FILTERS',
  EMBEDDABLE_ERROR = 'EMBEDDABLE_ERROR',
}

export interface EmbeddableIsInitializingAction extends Action {
  type: EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZING;
  payload: EmbeddableIsInitializingActionPayload;
}

export interface EmbeddableIsInitializedActionPayload {
  panelId: PanelId;
  metadata: EmbeddableMetadata;
}

export interface EmbeddableIsInitializedAction extends Action {
  type: EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZED;
  payload: EmbeddableIsInitializedActionPayload;
}

export interface SetStagedFilterActionPayload {
  panelId: PanelId;
  stagedFilter: object;
}

export interface SetStagedFilterAction extends Action {
  type: EmbeddableActionTypeKeys.SET_STAGED_FILTER;
  payload: SetStagedFilterActionPayload;
}

export interface ClearStagedFiltersAction extends Action {
  type: EmbeddableActionTypeKeys.CLEAR_STAGED_FILTERS;
  payload: undefined;
}

export interface EmbeddableErrorActionPayload {
  error: string | object;
  panelId: PanelId;
}

export interface EmbeddableErrorAction extends Action {
  type: EmbeddableActionTypeKeys.EMBEDDABLE_ERROR;
  payload: EmbeddableErrorActionPayload;
}

export type EmbeddableActions =
  | EmbeddableIsInitializingAction
  | EmbeddableIsInitializedAction
  | ClearStagedFiltersAction
  | SetStagedFilterAction
  | EmbeddableErrorAction;

export const embeddableIsInitializing = createAction<
  EmbeddableIsInitializingActionPayload
>(EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZING);
export const embeddableIsInitialized = createAction<
  EmbeddableIsInitializedActionPayload
>(EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZED);
export const setStagedFilter = createAction<SetStagedFilterActionPayload>(
  EmbeddableActionTypeKeys.SET_STAGED_FILTER
);
export const clearStagedFilters = createAction<void>(
  EmbeddableActionTypeKeys.CLEAR_STAGED_FILTERS
);
export const embeddableError = createAction<EmbeddableErrorActionPayload>(
  EmbeddableActionTypeKeys.EMBEDDABLE_ERROR
);

/**
 * The main point of communication from the embeddable to the dashboard. Any time state in the embeddable
 * changes, this function will be called. The data is then extracted from EmbeddableState and stored in
 * redux so the appropriate actions are taken and UI updated.
 *
 * @param {string} panelId - the id of the panel whose state has changed.
 * @param {EmbeddableState} embeddableState - the new state of the embeddable.
 */
export function embeddableStateChanged(changeData: {
  panelId: string;
  embeddableState: EmbeddableState;
}) {
  const { panelId, embeddableState } = changeData;
  return (
    dispatch: Dispatch<CoreKibanaState>,
    getState: () => CoreKibanaState
  ) => {
    // Translate embeddableState to things redux cares about.
    const customization = getEmbeddableCustomization(getState(), panelId);
    if (!_.isEqual(embeddableState.customization, customization)) {
      const originalPanelState = getPanel(getState(), panelId);
      const newPanelState: PanelState = {
        ...originalPanelState,
        embeddableConfig: _.cloneDeep(embeddableState.customization),
      };
      dispatch(updatePanel(newPanelState));
    }

    if (embeddableState.stagedFilter) {
      dispatch(
        setStagedFilter({ stagedFilter: embeddableState.stagedFilter, panelId })
      );
    }
  };
}
