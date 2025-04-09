/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { workspaceReducer } from './workspace';
import { navigationReducer, setIsNavigationCollapsed } from './navigation';
import { toolbarReducer, openToolbar, closeToolbar, setToolbarSize } from './toolbar';
import { headerReducer } from './header';
import {
  setIsModern,
  setIsSearchInToolbar,
  setIsToolbarRight,
  workspaceSlice,
} from './workspace/slice';
import { toolbarSlice } from './toolbar/slice';
import { headerSlice } from './header/slice';
import { navigationSlice } from './navigation/slice';
import { notificationSlice } from './notifications/slice';

const initialState = {
  workspace: workspaceSlice.getInitialState(),
  toolbar: toolbarSlice.getInitialState(),
  header: headerSlice.getInitialState(),
  navigation: navigationSlice.getInitialState(),
  notification: notificationSlice.getInitialState(),
};

const preloadedState = JSON.parse(
  sessionStorage.getItem('workspace') || JSON.stringify(initialState)
);

export const createStore = () => {
  const listenerMiddleware = createListenerMiddleware();

  const store = configureStore({
    preloadedState,
    reducer: {
      workspace: workspaceReducer,
      navigation: navigationReducer,
      toolbar: toolbarReducer,
      header: headerReducer,
      notifications: notificationSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(listenerMiddleware.middleware),
  });

  listenerMiddleware.startListening({
    matcher: isAnyOf(
      setIsNavigationCollapsed,
      openToolbar,
      closeToolbar,
      setToolbarSize,
      setIsModern,
      setIsToolbarRight,
      setIsSearchInToolbar
    ),
    effect: () => {
      sessionStorage.setItem('workspace', JSON.stringify(store.getState()));
    },
  });

  return store;
};

export type WorkspaceStore = ReturnType<typeof createStore>;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootWorkspaceState = ReturnType<WorkspaceStore['getState']>;

// Inferred type
export type WorkspaceDispatch = WorkspaceStore['dispatch'];

export const useWorkspaceDispatch: () => WorkspaceDispatch = useDispatch;
export const useWorkspaceSelector: TypedUseSelectorHook<RootWorkspaceState> = useSelector;
