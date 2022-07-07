/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import {
  configureStore,
  createSlice,
  Draft,
  PayloadAction,
  SliceCaseReducers,
} from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { cleanFiltersForSerialize, stateContainsFilters } from './redux_embeddable_wrapper';
import {
  EmbeddableReducers,
  ReduxContainerContext,
  ReduxEmbeddableContext,
  ReduxEmbeddableState,
} from './types';

export const buildReduxEmbeddableContext = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
>({
  embeddable,
  reducers,
}: {
  embeddable: IEmbeddable<ReduxEmbeddableStateType['input'], ReduxEmbeddableStateType['output']>;
  reducers: EmbeddableReducers<ReduxEmbeddableStateType>;
}): ReduxEmbeddableContext | ReduxContainerContext => {
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

  return {
    actions: slice.actions as ReduxEmbeddableContext['actions'],
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
};
