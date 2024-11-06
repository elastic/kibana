/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AnyAction,
  Middleware,
  createSlice,
  configureStore,
  SliceCaseReducers,
  CaseReducerActions,
} from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { createContext } from 'react';
import { createSelectorHook } from 'react-redux';

import { ReduxTools, ReduxToolsReducers, ReduxToolsSetters } from './types';

export const createReduxTools = <
  ReduxStateType extends unknown,
  ReducerType extends ReduxToolsReducers<ReduxStateType> = ReduxToolsReducers<ReduxStateType>
>({
  reducers,
  additionalMiddleware,
  initialState,
}: {
  additionalMiddleware?: Array<Middleware<AnyAction>>;
  initialState: ReduxStateType;
  reducers: ReducerType;
}): ReduxTools<ReduxStateType, ReducerType> => {
  const id = uuidv4();

  /**
   * Create slice out of reducers and embeddable initial state.
   */
  const slice = createSlice<ReduxStateType, SliceCaseReducers<ReduxStateType>>({
    initialState,
    name: id,
    reducers,
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
  const dispatch: ReduxToolsSetters<ReduxStateType, ReducerType> = Object.keys(reducers).reduce(
    (acc, key: keyof ReducerType) => {
      const sliceAction =
        slice.actions[key as keyof CaseReducerActions<SliceCaseReducers<ReduxStateType>, string>];
      acc[key] = (payload) => store.dispatch(sliceAction(payload));
      return acc;
    },
    {} as ReduxToolsSetters<ReduxStateType, ReducerType>
  );

  /**
   * Create a selector which can be used by react components to get the latest state values and to re-render when state changes.
   */
  const select = createSelectorHook(
    createContext({
      store,
      storeState: store.getState(),
    })
  );

  return {
    store,
    select,
    dispatch,
    getState: store.getState,
    onStateChange: store.subscribe,
  };
};
