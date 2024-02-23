/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext } from 'react';
import { createDispatchHook, createSelectorHook, ReactReduxContextValue } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { reducer } from './reducer';
import { initialState, State } from './state';

export const store = configureStore({
  reducer,
  devTools: process.env.NODE_ENV !== 'production',
  enhancers: [],
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);

const stateSelector = (state: State) => state;

export const selectPanelsById = (id: string) =>
  createSelector(stateSelector, (state) => state.byId[id] || {});

export const selectNeedsSync = () => createSelector(stateSelector, (state) => state.needsSync);
