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
import { useSidebarService } from '../providers';

/**
 * Hook based API for interacting with the sidebar state
 */
export interface UseSidebarApi {
  isOpen: boolean;
  open: <TParams = {}>(appId: string, params?: Partial<TParams>) => void;
  close: () => void;
  setWidth: (width: number) => void;
  setParams: <TParams = {}>(appId: string, params: Partial<TParams>) => void;
  currentAppId: string | null;
}

/**
 * React hook for accessing the sidebar state and actions
 */
export function useSidebar(): UseSidebarApi {
  const sidebarService = useSidebarService();
  const sidebar = sidebarService.state;

  const isOpen = useObservable(sidebar.isOpen$(), sidebar.isOpen());
  const currentAppId = useObservable(sidebar.getCurrentAppId$(), sidebar.getCurrentAppId());

  const open = useCallback(
    <TParams = {},>(appId: string, params?: Partial<TParams>) => sidebar.open(appId, params),
    [sidebar]
  );
  const close = useCallback(() => sidebar.close(), [sidebar]);
  const setWidth = useCallback((newWidth: number) => sidebar.setWidth(newWidth), [sidebar]);
  const setParams = useCallback(
    <TParams = {},>(appId: string, params: Partial<TParams>) =>
      sidebarService.appState.setParams(appId, params),
    [sidebarService]
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
  const sidebar = useSidebarService().state;
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
export function useSidebarApp<TParams = {}>(appId: string): UseSidebarAppApi<TParams> {
  const sidebarService = useSidebarService();

  const open = useCallback(
    (params?: Partial<TParams>) => sidebarService.state.open<TParams>(appId, params),
    [sidebarService, appId]
  );
  const setParams = useCallback(
    (params: Partial<TParams>) => sidebarService.appState.setParams<TParams>(appId, params),
    [sidebarService, appId]
  );

  return useMemo(() => ({ open, setParams }), [open, setParams]);
}
