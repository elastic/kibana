/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { useObservable } from '@kbn/use-observable';
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';
import type { SidebarAppId, SidebarAppStatus } from '@kbn/core-chrome-sidebar';

/** Global sidebar state API */
export interface UseSidebarApi {
  isOpen: boolean;
  currentAppId: SidebarAppId | null;
  close: () => void;
  setWidth: (width: number) => void;
}

/** Hook for global sidebar state. For app-specific ops, use `useSidebarApp`. */
export function useSidebar(): UseSidebarApi {
  const sidebar = useSidebarService();

  const isOpen = useObservable(sidebar.isOpen$(), sidebar.isOpen());
  const currentAppId = useObservable(sidebar.getCurrentAppId$(), sidebar.getCurrentAppId());

  const close = useCallback(() => sidebar.close(), [sidebar]);
  const setWidth = useCallback((newWidth: number) => sidebar.setWidth(newWidth), [sidebar]);

  return useMemo(
    () => ({
      isOpen,
      currentAppId,
      close,
      setWidth,
    }),
    [isOpen, currentAppId, close, setWidth]
  );
}

/** Hook for sidebar width */
export function useSidebarWidth(): number {
  const sidebar = useSidebarService();
  return useObservable(sidebar.getWidth$(), sidebar.getWidth());
}

/**
 * App-specific sidebar API with reactive state and actions.
 * For stateless apps, `state` and `actions` are undefined.
 */
export interface UseSidebarAppApi<TState = undefined, TActions = undefined> {
  /** Current state (reactive). Undefined for stateless apps. */
  state: TState;
  /** Bound actions to modify state. Undefined for stateless apps. */
  actions: TActions;
  /** Current app status (reactive) */
  status: SidebarAppStatus;
  /** Open sidebar to this app */
  open: () => void;
  /** Close sidebar */
  close: () => void;
}

/** Hook for app-specific sidebar actions and state */
export function useSidebarApp<TState = undefined, TActions = undefined>(
  appId: SidebarAppId
): UseSidebarAppApi<TState, TActions> {
  const sidebar = useSidebarService();
  const appApi = sidebar.getApp<TState, TActions>(appId);

  const state = useObservable(appApi.getState$(), appApi.getState());
  const status = useObservable(appApi.getStatus$(), appApi.getStatus());

  const open = useCallback(() => appApi.open(), [appApi]);
  const close = useCallback(() => appApi.close(), [appApi]);

  return useMemo(
    () => ({
      state,
      actions: appApi.actions,
      status,
      open,
      close,
    }),
    [state, appApi.actions, status, open, close]
  );
}
