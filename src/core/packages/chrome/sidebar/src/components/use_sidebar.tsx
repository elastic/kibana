/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useObservable } from '@kbn/use-observable';
import { useSidebarService } from './sidebar_provider';

/**
 * Hook based API for interacting with the sidebar state
 */
export interface UseSidebarHook {
  isOpen: boolean;
  open: (appId: string) => void;
  close: () => void;

  currentAppId: string | null;

  width: number;
  setWidth: (width: number) => void;
}

/**
 * React hook for accessing the sidebar state and actions
 */
export function useSidebar(): UseSidebarHook {
  const sidebar = useSidebarService().state;

  const isOpen = useObservable(sidebar.isOpen$, sidebar.isOpen());
  const width = useObservable(sidebar.width$, sidebar.getWidth());
  const currentAppId = useObservable(sidebar.currentAppId$, sidebar.getCurrentAppId());

  return {
    isOpen,
    width,
    currentAppId,
    open: useCallback((appId: string) => sidebar.open(appId), [sidebar]),
    close: useCallback(() => sidebar.close(), [sidebar]),
    setWidth: useCallback((_width: number) => sidebar.setWidth(_width), [sidebar]),
  };
}

/**
 * Return type for useSidebarAppState hook
 */
export type UseSidebarAppStateReturn<T> = readonly [
  state: T,
  actions: {
    set: (state: T) => void;
    update: (partial: Partial<T>) => void;
    reset: () => void;
  }
];

export function useSidebarAppState<T>(appId: string): UseSidebarAppStateReturn<T> {
  const service = useSidebarService();
  const state = useObservable(
    service.appState.getAppState$<T>(appId),
    service.appState.getAppState<T>(appId)
  );

  const setState = useCallback(
    (newState: T) => service.appState.setAppState(appId, newState),
    [appId, service]
  );

  const updateState = useCallback(
    (partial: Partial<T>) => service.appState.updateAppState(appId, partial),
    [appId, service]
  );

  const resetState = useCallback(() => service.appState.resetAppState(appId), [appId, service]);

  return [state, { set: setState, update: updateState, reset: resetState }];
}
