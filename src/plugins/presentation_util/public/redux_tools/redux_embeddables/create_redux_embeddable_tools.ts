/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Draft, AnyAction, Middleware, PayloadAction } from '@reduxjs/toolkit';

import { Embeddable } from '@kbn/embeddable-plugin/public';

import { ReduxToolsReducers } from '../types';
import { createReduxTools } from '../create_redux_tools';
import { syncReduxEmbeddable } from './sync_redux_embeddable';
import { cleanStateForRedux } from './clean_redux_embeddable_state';
import { ReduxEmbeddableTools, ReduxEmbeddableState, ReduxEmbeddableSyncSettings } from './types';

export const createReduxEmbeddableTools = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends ReduxToolsReducers<ReduxEmbeddableStateType> = ReduxToolsReducers<ReduxEmbeddableStateType>
>({
  reducers,
  embeddable,
  syncSettings,
  additionalMiddleware,
  initialComponentState,
}: {
  embeddable: Embeddable<
    ReduxEmbeddableStateType['explicitInput'],
    ReduxEmbeddableStateType['output']
  >;
  additionalMiddleware?: Array<Middleware<AnyAction>>;
  initialComponentState?: ReduxEmbeddableStateType['componentState'];
  syncSettings?: ReduxEmbeddableSyncSettings;
  reducers: ReducerType;
}): ReduxEmbeddableTools<ReduxEmbeddableStateType, ReducerType> => {
  /**
   * Build additional generic reducers to aid in embeddable syncing.
   */
  const genericReducers = {
    replaceEmbeddableReduxInput: (
      state: Draft<ReduxEmbeddableStateType>,
      action: PayloadAction<ReduxEmbeddableStateType['explicitInput']>
    ) => {
      state.explicitInput = action.payload;
    },
    replaceEmbeddableReduxOutput: (
      state: Draft<ReduxEmbeddableStateType>,
      action: PayloadAction<ReduxEmbeddableStateType['output']>
    ) => {
      state.output = action.payload;
    },
  };
  const allReducers = { ...reducers, ...genericReducers };

  /**
   * Create initial state from Embeddable.
   */
  let initialState: ReduxEmbeddableStateType = {
    output: embeddable.getOutput(),
    componentState: initialComponentState ?? {},
    explicitInput: embeddable.getExplicitInput(),
  } as ReduxEmbeddableStateType;

  initialState = cleanStateForRedux<ReduxEmbeddableStateType>(initialState);

  const { dispatch, store, select, getState, onStateChange } = createReduxTools<
    ReduxEmbeddableStateType,
    typeof allReducers
  >({
    reducers: allReducers,
    additionalMiddleware,
    initialState,
  });

  /**
   * Sync redux state with embeddable input and output observables. Eventually we can replace the input and output observables
   * with redux and remove this sync.
   */
  const stopReduxEmbeddableSync = syncReduxEmbeddable<ReduxEmbeddableStateType>({
    replaceEmbeddableReduxInput: dispatch.replaceEmbeddableReduxInput,
    replaceEmbeddableReduxOutput: dispatch.replaceEmbeddableReduxOutput,
    settings: syncSettings,
    embeddable,
    store,
  });

  return {
    store,
    select,
    dispatch,
    getState,
    onStateChange,
    cleanup: () => stopReduxEmbeddableSync?.(),
  };
};
