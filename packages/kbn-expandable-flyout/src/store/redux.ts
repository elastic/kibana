/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext } from 'react';
import { createDispatchHook, createSelectorHook, ReactReduxContextValue } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { panelsReducer, uiReducer } from './reducers';
import { initialState, State } from './state';
import {
  savePushVsOverlayToLocalStorageMiddleware,
  saveUserSectionWidthsToLocalStorageMiddleware,
  saveUserFlyoutWidthsToLocalStorageMiddleware,
  clearAllUserWidthsFromLocalStorageMiddleware,
} from './middlewares';

export const store = configureStore({
  reducer: {
    panels: panelsReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: [
    savePushVsOverlayToLocalStorageMiddleware,
    saveUserSectionWidthsToLocalStorageMiddleware,
    saveUserFlyoutWidthsToLocalStorageMiddleware,
    clearAllUserWidthsFromLocalStorageMiddleware,
  ],
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);

const stateSelector = (state: State) => state;

const panelsSelector = createSelector(stateSelector, (state) => state.panels);
export const selectPanelsById = (id: string) =>
  createSelector(panelsSelector, (state) => state.byId[id] || {});
export const selectNeedsSync = () => createSelector(panelsSelector, (state) => state.needsSync);

const uiSelector = createSelector(stateSelector, (state) => state.ui);
export const selectPushVsOverlay = createSelector(uiSelector, (state) => state.pushVsOverlay);
export const selectDefaultWidths = createSelector(uiSelector, (state) => state.defaultWidths);
export const selectUserFlyoutWidths = createSelector(uiSelector, (state) => state.userFlyoutWidths);
export const selectUserSectionWidths = createSelector(
  uiSelector,
  (state) => state.userSectionWidths
);
