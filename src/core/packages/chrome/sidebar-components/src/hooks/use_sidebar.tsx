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
import type { SidebarAppId, SidebarApp } from '@kbn/core-chrome-sidebar';

/**
 * Hook based API for interacting with the global sidebar state.
 * For app-specific operations, use `useSidebarApp(appId)`.
 */
export interface UseSidebarApi {
  /** Whether the sidebar is currently open */
  isOpen: boolean;
  /** The currently open app ID, or null if closed */
  currentAppId: SidebarAppId | null;
  /** Close the sidebar */
  close: () => void;
  /** Set the sidebar width */
  setWidth: (width: number) => void;
  /** Get an app-bound API for a specific sidebar app */
  getApp: <TParams = unknown>(appId: SidebarAppId) => SidebarApp<TParams>;
}

/**
 * React hook for accessing the global sidebar state and actions.
 * For app-specific operations, use `useSidebarApp(appId)`.
 */
export function useSidebar(): UseSidebarApi {
  const sidebar = useSidebarService();

  const isOpen = useObservable(sidebar.isOpen$(), sidebar.isOpen());
  const currentAppId = useObservable(sidebar.getCurrentAppId$(), sidebar.getCurrentAppId());

  const close = useCallback(() => sidebar.close(), [sidebar]);
  const setWidth = useCallback((newWidth: number) => sidebar.setWidth(newWidth), [sidebar]);
  const getApp = useCallback(
    <TParams = unknown>(appId: SidebarAppId) => sidebar.getApp<TParams>(appId),
    [sidebar]
  );

  return useMemo(
    () => ({
      isOpen,
      currentAppId,
      close,
      setWidth,
      getApp,
    }),
    [isOpen, currentAppId, close, setWidth, getApp]
  );
}

/**
 * React hook for accessing the sidebar width
 */
export function useSidebarWidth(): number {
  const sidebar = useSidebarService();
  return useObservable(sidebar.getWidth$(), sidebar.getWidth());
}

/**
 * Hook based API for interacting with a specific sidebar app.
 * Extends `SidebarApp` with reactive `params` state.
 */
export interface UseSidebarAppApi<TParams = unknown> extends SidebarApp<TParams> {
  /** Current params (reactive, updates when params change) */
  params: TParams;
}

/**
 * React hook for accessing actions and state for a specific sidebar app.
 * @param appId The sidebar app ID
 */
export function useSidebarApp<TParams = unknown>(appId: SidebarAppId): UseSidebarAppApi<TParams> {
  const sidebar = useSidebarService();
  const appApi = sidebar.getApp<TParams>(appId);

  const params = useObservable(appApi.getParams$(), appApi.getParams());

  const open = useCallback(
    (openParams?: Partial<TParams>) => appApi.open(openParams),
    [appApi]
  );
  const close = useCallback(() => appApi.close(), [appApi]);
  const setParams = useCallback(
    (newParams: Partial<TParams>) => appApi.setParams(newParams),
    [appApi]
  );
  const getParams = useCallback(() => appApi.getParams(), [appApi]);
  const getParams$ = useCallback(() => appApi.getParams$(), [appApi]);
  const setAvailable = useCallback(
    (available: boolean) => appApi.setAvailable(available),
    [appApi]
  );

  return useMemo(
    () => ({
      params,
      open,
      close,
      setParams,
      getParams,
      getParams$,
      setAvailable,
    }),
    [params, open, close, setParams, getParams, getParams$, setAvailable]
  );
}
