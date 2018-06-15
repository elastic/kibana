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
import { Dispatch } from 'redux';
import { createAction } from 'redux-actions';
import {
  CoreKibanaState,
  getEmbeddableCustomization,
  getPanel,
} from '../../selectors';
import { PanelId, PanelState } from '../selectors';
import { updatePanel } from './panels';

import { EmbeddableMetadata, EmbeddableState } from 'ui/embeddable';
import { KibanaAction } from '../../selectors/types';

export enum EmbeddableActionTypeKeys {
  EMBEDDABLE_IS_INITIALIZING = 'EMBEDDABLE_IS_INITIALIZING',
  EMBEDDABLE_IS_INITIALIZED = 'EMBEDDABLE_IS_INITIALIZED',
  SET_STAGED_FILTER = 'SET_STAGED_FILTER',
  CLEAR_STAGED_FILTERS = 'CLEAR_STAGED_FILTERS',
  EMBEDDABLE_ERROR = 'EMBEDDABLE_ERROR',
}

export interface EmbeddableIsInitializingAction
  extends KibanaAction<
      EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZING,
      PanelId
    > {}

export interface EmbeddableIsInitializedActionPayload {
  panelId: PanelId;
  metadata: EmbeddableMetadata;
}

export interface EmbeddableIsInitializedAction
  extends KibanaAction<
      EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZED,
      EmbeddableIsInitializedActionPayload
    > {}

export interface SetStagedFilterActionPayload {
  panelId: PanelId;
  stagedFilter: object;
}

export interface SetStagedFilterAction
  extends KibanaAction<
      EmbeddableActionTypeKeys.SET_STAGED_FILTER,
      SetStagedFilterActionPayload
    > {}

export interface ClearStagedFiltersAction
  extends KibanaAction<
      EmbeddableActionTypeKeys.CLEAR_STAGED_FILTERS,
      undefined
    > {}

export interface EmbeddableErrorActionPayload {
  error: string | object;
  panelId: PanelId;
}

export interface EmbeddableErrorAction
  extends KibanaAction<
      EmbeddableActionTypeKeys.EMBEDDABLE_ERROR,
      EmbeddableErrorActionPayload
    > {}

export type EmbeddableActions =
  | EmbeddableIsInitializingAction
  | EmbeddableIsInitializedAction
  | ClearStagedFiltersAction
  | SetStagedFilterAction
  | EmbeddableErrorAction;

export const embeddableIsInitializing = createAction<PanelId>(
  EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZING
);
export const embeddableIsInitialized = createAction<
  EmbeddableIsInitializedActionPayload
>(EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZED);
export const setStagedFilter = createAction<SetStagedFilterActionPayload>(
  EmbeddableActionTypeKeys.SET_STAGED_FILTER
);
export const clearStagedFilters = createAction(
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
 * @param changeData.panelId - the id of the panel whose state has changed.
 * @param changeData.embeddableState - the new state of the embeddable.
 */
export function embeddableStateChanged(changeData: {
  panelId: PanelId;
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
