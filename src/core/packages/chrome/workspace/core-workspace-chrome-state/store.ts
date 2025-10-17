/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import { workspaceReducer } from './workspace';
import { navigationReducer, setIsNavigationCollapsed } from './navigation';
import { headerReducer } from './header';
import { layoutReducer } from './layout';
import { workspaceSlice } from './workspace/slice';
import {
  closeSidebar,
  openSidebar,
  setSidebarWidth,
  sidebarReducer,
  sidebarSlice,
} from './sidebar/slice';
import { headerSlice } from './header/slice';
import { navigationSlice } from './navigation/slice';
import { layoutSlice } from './layout/slice';

const initialState = {
  workspace: workspaceSlice.getInitialState(),
  sidebar: sidebarSlice.getInitialState(),
  header: headerSlice.getInitialState(),
  navigation: navigationSlice.getInitialState(),
  layout: layoutSlice.getInitialState(),
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
      sidebar: sidebarReducer,
      header: headerReducer,
      layout: layoutReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(listenerMiddleware.middleware),
  });

  listenerMiddleware.startListening({
    matcher: isAnyOf(setIsNavigationCollapsed, openSidebar, closeSidebar, setSidebarWidth),
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
