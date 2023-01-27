/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Draft,
  AnyAction,
  Middleware,
  createSlice,
  PayloadAction,
  configureStore,
  SliceCaseReducers,
  CaseReducerActions,
} from '@reduxjs/toolkit';
import { createContext } from 'react';
import { createSelectorHook } from 'react-redux';

import { Embeddable } from '@kbn/embeddable-plugin/public';

import {
  EmbeddableReducers,
  ReduxEmbeddableTools,
  ReduxEmbeddableState,
  ReduxEmbeddableSetters,
  ReduxEmbeddableSyncSettings,
} from './types';
import { cleanStateForRedux } from './clean_redux_embeddable_state';
import { EmbeddableSyncActions, syncReduxEmbeddable } from './sync_redux_embeddable';

export const createReduxEmbeddableTools = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
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

  /**
   * Create initial state from Embeddable.
   */
  let initialState: ReduxEmbeddableStateType = {
    output: embeddable.getOutput(),
    componentState: initialComponentState ?? {},
    explicitInput: embeddable.getExplicitInput(),
  } as ReduxEmbeddableStateType;

  initialState = cleanStateForRedux<ReduxEmbeddableStateType>(initialState);

  /**
   * Create slice out of reducers and embeddable initial state.
   */
  const slice = createSlice<ReduxEmbeddableStateType, SliceCaseReducers<ReduxEmbeddableStateType>>({
    initialState,
    name: `${embeddable.type}_${embeddable.id}`,
    reducers: { ...reducers, ...genericReducers },
  });

  const store = configureStore({
    reducer: slice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(...(additionalMiddleware ?? [])),
  });

  /**
   * Create an object of setter functions by looping through the reducers, and creating a method that dispatches the related
   * action to the appropriate store.
   */
  const dispatch: ReduxEmbeddableSetters<ReduxEmbeddableStateType, ReducerType> = Object.keys(
    reducers
  ).reduce((acc, key: keyof ReducerType) => {
    const sliceAction =
      slice.actions[key as keyof CaseReducerActions<SliceCaseReducers<ReduxEmbeddableStateType>>];
    acc[key] = (payload) => store.dispatch(sliceAction(payload));
    return acc;
  }, {} as ReduxEmbeddableSetters<ReduxEmbeddableStateType, ReducerType>);

  /**
   * Create a selector which can be used by react components to get the latest state values and to re-render when state changes.
   */
  const select = createSelectorHook(
    createContext({
      store,
      storeState: store.getState(),
    })
  );

  /**
   * Sync redux state with embeddable input and output observables. Eventually we can replace the input and output observables
   * with redux and remove this sync.
   */
  const stopReduxEmbeddableSync = syncReduxEmbeddable<ReduxEmbeddableStateType>({
    syncActions: {
      replaceEmbeddableReduxInput: slice.actions
        .replaceEmbeddableReduxInput as EmbeddableSyncActions<ReduxEmbeddableStateType>['replaceEmbeddableReduxInput'],
      replaceEmbeddableReduxOutput: slice.actions
        .replaceEmbeddableReduxOutput as EmbeddableSyncActions<ReduxEmbeddableStateType>['replaceEmbeddableReduxOutput'],
    },
    settings: syncSettings,
    embeddable,
    store,
  });

  return {
    select,
    dispatch,
    getState: store.getState,
    onStateChange: store.subscribe,
    cleanup: () => stopReduxEmbeddableSync?.(),
  };
};
