/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AnyAction,
  CaseReducerActions,
  configureStore,
  createSlice,
  Draft,
  Middleware,
  PayloadAction,
  SliceCaseReducers,
} from '@reduxjs/toolkit';
import React, { ReactNode, PropsWithChildren, createContext } from 'react';
import {
  createSelectorHook,
  Provider,
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from 'react-redux';

import { Embeddable } from '@kbn/embeddable-plugin/public';

import {
  EmbeddableReducers,
  ReduxEmbeddableTools,
  ReduxEmbeddableContext,
  ReduxEmbeddableState,
  ReduxEmbeddableSyncSettings,
  ReduxEmbeddableDispatch,
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

  // this object is the combination of the dispatch for this store with each action so that they don't need to be combined later.
  const dispatchActions: ReduxEmbeddableDispatch<ReduxEmbeddableStateType, ReducerType> =
    Object.keys(reducers).reduce((acc, key: keyof ReducerType) => {
      const sliceAction =
        slice.actions[key as keyof CaseReducerActions<SliceCaseReducers<ReduxEmbeddableStateType>>];
      acc[key] = (payload) => store.dispatch(sliceAction(payload));
      return acc;
    }, {} as ReduxEmbeddableDispatch<ReduxEmbeddableStateType, ReducerType>);

  // create a selector which can be used by react components to get the latest state values and to re-render when state changes.
  const select = createSelectorHook(
    createContext({
      store,
      storeState: store.getState(),
    })
  );

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
    store,
    select,
    dispatchActions,
    getState: store.getState,
    onStateChange: store.subscribe,
    cleanup: () => stopReduxEmbeddableSync?.(),

    // todo eventually remove wrapper.
    Wrapper,

    // todo remove actions & dispatch
    actions: context.actions,
    dispatch: store.dispatch,
  };
};
