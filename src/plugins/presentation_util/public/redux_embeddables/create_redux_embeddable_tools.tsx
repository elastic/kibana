/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AnyAction,
  configureStore,
  createSlice,
  Draft,
  Middleware,
  PayloadAction,
  SliceCaseReducers,
} from '@reduxjs/toolkit';
import React, { ReactNode, PropsWithChildren } from 'react';
import { Provider, TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { Embeddable } from '@kbn/embeddable-plugin/public';

import {
  EmbeddableReducers,
  ReduxEmbeddableTools,
  ReduxEmbeddableContext,
  ReduxEmbeddableState,
  ReduxEmbeddableSyncSettings,
} from './types';
import { syncReduxEmbeddable } from './sync_redux_embeddable';
import { EmbeddableReduxContext } from './use_redux_embeddable_context';
import { cleanStateForRedux } from './clean_redux_embeddable_state';

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
  // Additional generic reducers to aid in embeddable syncing
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

  // create initial state from Embeddable
  let initialState: ReduxEmbeddableStateType = {
    output: embeddable.getOutput(),
    componentState: initialComponentState ?? {},
    explicitInput: embeddable.getExplicitInput(),
  } as ReduxEmbeddableStateType;

  initialState = cleanStateForRedux<ReduxEmbeddableStateType>(initialState);

  // create slice out of reducers and embeddable initial state.
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

  // create the context which will wrap this embeddable's react components to allow access to update and read from the store.
  const context = {
    embeddableInstance: embeddable,

    actions: slice.actions as ReduxEmbeddableContext<
      ReduxEmbeddableStateType,
      typeof reducers
    >['actions'],
    useEmbeddableDispatch: () => useDispatch<typeof store.dispatch>(),
    useEmbeddableSelector: useSelector as TypedUseSelectorHook<ReduxEmbeddableStateType>,
  };

  const Wrapper: React.FC<PropsWithChildren<{}>> = ({ children }: { children?: ReactNode }) => (
    <Provider store={store}>
      <EmbeddableReduxContext.Provider value={context}>{children}</EmbeddableReduxContext.Provider>
    </Provider>
  );

  const stopReduxEmbeddableSync = syncReduxEmbeddable<ReduxEmbeddableStateType>({
    actions: context.actions,
    settings: syncSettings,
    embeddable,
    store,
  });

  // return redux tools for the embeddable class to use.
  return {
    Wrapper,
    actions: context.actions,
    dispatch: store.dispatch,
    getState: store.getState,
    onStateChange: store.subscribe,
    cleanup: () => stopReduxEmbeddableSync?.(),
  };
};
