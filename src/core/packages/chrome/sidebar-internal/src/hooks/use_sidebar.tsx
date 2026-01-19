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
import type { SidebarAppId } from '@kbn/core-chrome-sidebar';

/**
 * Hook based API for interacting with the sidebar state
 */
export interface UseSidebarApi {
  isOpen: boolean;
  open: <TParams = {}>(appId: SidebarAppId, params?: Partial<TParams>) => void;
  close: () => void;
  setWidth: (width: number) => void;
  setParams: <TParams = {}>(appId: SidebarAppId, params: Partial<TParams>) => void;
  currentAppId: SidebarAppId | null;
}

/**
 * React hook for accessing the sidebar state and actions
 */
export function useSidebar(): UseSidebarApi {
  const sidebar = useSidebarService();

  const isOpen = useObservable(sidebar.isOpen$(), sidebar.isOpen());
  const currentAppId = useObservable(sidebar.getCurrentAppId$(), sidebar.getCurrentAppId());

  const open = useCallback(
    <TParams = {},>(appId: SidebarAppId, params?: Partial<TParams>) => sidebar.open(appId, params),
    [sidebar]
  );
  const close = useCallback(() => sidebar.close(), [sidebar]);
  const setWidth = useCallback((newWidth: number) => sidebar.setWidth(newWidth), [sidebar]);
  const setParams = useCallback(
    <TParams = {},>(appId: SidebarAppId, params: Partial<TParams>) =>
      sidebar.setParams(appId, params),
    [sidebar]
  );

  return useMemo(
    () => ({
      isOpen,
      currentAppId,
      open,
      close,
      setWidth,
      setParams,
    }),
    [isOpen, currentAppId, open, close, setWidth, setParams]
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
 * Hook based API for interacting with a specific sidebar app
 */
export interface UseSidebarAppApi<TParams = {}> {
  open: (params?: Partial<TParams>) => void;
  setParams: (params: Partial<TParams>) => void;
}

/**
 * React hook for accessing actions for a specific sidebar app
 * @param appId
 */
export function useSidebarApp<TParams = {}>(appId: SidebarAppId): UseSidebarAppApi<TParams> {
  const sidebar = useSidebarService();

  const open = useCallback(
    (params?: Partial<TParams>) => sidebar.open<TParams>(appId, params),
    [sidebar, appId]
  );
  const setParams = useCallback(
    (params: Partial<TParams>) => sidebar.setParams<TParams>(appId, params),
    [sidebar, appId]
  );

  return useMemo(() => ({ open, setParams }), [open, setParams]);
}
