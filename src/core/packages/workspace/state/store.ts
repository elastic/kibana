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
import { toolboxReducer, openToolbox, closeToolbox, setToolboxSize } from './toolbox';
import { headerReducer } from './header';
import { setIs2030 } from './workspace/slice';

const listenerMiddleware = createListenerMiddleware();
listenerMiddleware.startListening({
  matcher: isAnyOf(setIsNavigationCollapsed, openToolbox, closeToolbox, setToolboxSize, setIs2030),
  effect: (action) => {
    const {
      workspace: { is2030 },
      navigation: { isCollapsed },
      toolbox: { currentToolId, isOpen, size },
    } = store.getState();

    const value = {
      workspace: { is2030 },
      navigation: { isCollapsed },
      toolbox: { currentToolId, isOpen, size },
    };

    localStorage.setItem('workspace', JSON.stringify(value));

    if (action.type === setIs2030.type) {
      // window.location.reload();
    }
  },
});

const preloadedState = JSON.parse(localStorage.getItem('workspace') || '{}');

export const store = configureStore({
  preloadedState,
  reducer: {
    workspace: workspaceReducer,
    navigation: navigationReducer,
    toolbox: toolboxReducer,
    header: headerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(listenerMiddleware.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootWorkspaceState = ReturnType<typeof store.getState>;

// Inferred type
export type WorkspaceDispatch = typeof store.dispatch;

export const useWorkspaceDispatch: () => WorkspaceDispatch = useDispatch;

export const useWorkspaceSelector: TypedUseSelectorHook<RootWorkspaceState> = useSelector;
