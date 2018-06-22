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

import {
  EmbeddableActionTypeKeys,
  EmbeddableErrorActionPayload,
  EmbeddableIsInitializedActionPayload,
  PanelActionTypeKeys,
  SetStagedFilterActionPayload,
} from '../actions';
import {
  EmbeddableReduxState,
  EmbeddablesMap,
  PanelId,
} from '../selectors/types';

const embeddableIsInitializing = (
  embeddables: EmbeddablesMap,
  panelId: PanelId
): EmbeddablesMap => ({
  ...embeddables,
  [panelId]: {
    error: undefined,
    initialized: false,
    metadata: {},
    stagedFilter: undefined,
  },
});

const embeddableIsInitialized = (
  embeddables: EmbeddablesMap,
  { panelId, metadata }: EmbeddableIsInitializedActionPayload
): EmbeddablesMap => ({
  ...embeddables,
  [panelId]: {
    ...embeddables[panelId],
    initialized: true,
    metadata: { ...metadata },
  },
});

const setStagedFilter = (
  embeddables: EmbeddablesMap,
  { panelId, stagedFilter }: SetStagedFilterActionPayload
): EmbeddablesMap => ({
  ...embeddables,
  [panelId]: {
    ...embeddables[panelId],
    stagedFilter,
  },
});

const embeddableError = (
  embeddables: EmbeddablesMap,
  payload: EmbeddableErrorActionPayload
): EmbeddablesMap => ({
  ...embeddables,
  [payload.panelId]: {
    ...embeddables[payload.panelId],
    error: payload.error,
  },
});

const clearStagedFilters = (embeddables: EmbeddablesMap): EmbeddablesMap => {
  const omitStagedFilters = (
    embeddable: EmbeddableReduxState
  ): EmbeddablesMap => _.omit({ ...embeddable }, ['stagedFilter']);
  return _.mapValues<EmbeddablesMap>(embeddables, omitStagedFilters);
};

const deleteEmbeddable = (
  embeddables: EmbeddablesMap,
  panelId: PanelId
): EmbeddablesMap => {
  const embeddablesCopy = { ...embeddables };
  delete embeddablesCopy[panelId];
  return embeddablesCopy;
};

export const embeddablesReducer: Reducer<EmbeddablesMap> = (
  embeddables = {},
  action
): EmbeddablesMap => {
  switch (
    action.type as EmbeddableActionTypeKeys | PanelActionTypeKeys.DELETE_PANEL
  ) {
    case EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZING:
      return embeddableIsInitializing(embeddables, action.payload);
    case EmbeddableActionTypeKeys.EMBEDDABLE_IS_INITIALIZED:
      return embeddableIsInitialized(embeddables, action.payload);
    case EmbeddableActionTypeKeys.SET_STAGED_FILTER:
      return setStagedFilter(embeddables, action.payload);
    case EmbeddableActionTypeKeys.CLEAR_STAGED_FILTERS:
      return clearStagedFilters(embeddables);
    case EmbeddableActionTypeKeys.EMBEDDABLE_ERROR:
      return embeddableError(embeddables, action.payload);
    case PanelActionTypeKeys.DELETE_PANEL:
      return deleteEmbeddable(embeddables, action.payload);
    default:
      return embeddables;
  }
};
