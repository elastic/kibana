/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  configureStore,
  createSlice,
  Draft,
  PayloadAction,
  SliceCaseReducers,
} from '@reduxjs/toolkit';
import { Filter } from '@kbn/es-query';
import React, { ReactNode, PropsWithChildren } from 'react';
import { EmbeddableInput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { Provider, TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import {
  EmbeddableReducers,
  ReduxEmbeddableTools,
  ReduxEmbeddableContext,
  ReduxEmbeddableState,
  ReduxEmbeddableSyncSettings,
} from './types';
import { syncReduxEmbeddable } from './sync_redux_embeddable';
import { EmbeddableReduxContext } from './use_redux_embeddable_context';

// TODO: Make filters serializable so we don't need special treatment for them.
type InputWithFilters = Partial<EmbeddableInput> & { filters: Filter[] };
const stateContainsFilters = (state: Partial<EmbeddableInput>): state is InputWithFilters => {
  if ((state as InputWithFilters).filters) return true;
  return false;
};
const cleanFiltersForSerialize = (filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    if (filter.meta.value) delete filter.meta.value;
    return filter;
  });
};

export const createReduxEmbeddableTools = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
>({
  reducers,
  embeddable,
  syncSettings,
  initialComponentState,
}: {
  embeddable: IEmbeddable<ReduxEmbeddableStateType['input'], ReduxEmbeddableStateType['output']>;
  initialComponentState?: ReduxEmbeddableStateType['componentState'];
  syncSettings?: ReduxEmbeddableSyncSettings;
  reducers: ReducerType;
}): ReduxEmbeddableTools<ReduxEmbeddableStateType, ReducerType> => {
  // Additional generic reducers to aid in embeddable syncing
  const genericReducers = {
    updateEmbeddableReduxInput: (
      state: Draft<ReduxEmbeddableStateType>,
      action: PayloadAction<Partial<ReduxEmbeddableStateType['input']>>
    ) => {
      state.input = { ...state.input, ...action.payload };
    },
    updateEmbeddableReduxOutput: (
      state: Draft<ReduxEmbeddableStateType>,
      action: PayloadAction<Partial<ReduxEmbeddableStateType['output']>>
    ) => {
      state.output = { ...state.output, ...action.payload };
    },
  };

  // create initial state from Embeddable
  const initialState: ReduxEmbeddableStateType = {
    input: embeddable.getInput(),
    output: embeddable.getOutput(),
    componentState: initialComponentState ?? {},
  } as ReduxEmbeddableStateType;

  if (stateContainsFilters(initialState.input)) {
    initialState.input.filters = cleanFiltersForSerialize(initialState.input.filters);
  }

  // create slice out of reducers and embeddable initial state.
  const slice = createSlice<ReduxEmbeddableStateType, SliceCaseReducers<ReduxEmbeddableStateType>>({
    initialState,
    name: `${embeddable.type}_${embeddable.id}`,
    reducers: { ...reducers, ...genericReducers },
  });

  const store = configureStore({ reducer: slice.reducer });

  // create the context which will wrap this embeddable's react components to allow access to update and read from the store.
  const context = {
    actions: slice.actions as ReduxEmbeddableContext<
      ReduxEmbeddableStateType,
      typeof reducers
    >['actions'],
    useEmbeddableDispatch: () => useDispatch<typeof store.dispatch>(),
    useEmbeddableSelector: useSelector as TypedUseSelectorHook<ReduxEmbeddableStateType>,

    // populate container actions for embeddables which are Containers
    containerActions: embeddable.getIsContainer()
      ? {
          untilEmbeddableLoaded: embeddable.untilEmbeddableLoaded.bind(embeddable),
          updateInputForChild: embeddable.updateInputForChild.bind(embeddable),
          removeEmbeddable: embeddable.removeEmbeddable.bind(embeddable),
          addNewEmbeddable: embeddable.addNewEmbeddable.bind(embeddable),
          replaceEmbeddable: embeddable.replaceEmbeddable.bind(embeddable),
        }
      : undefined,
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
    cleanup: () => stopReduxEmbeddableSync?.(),
  };
};
