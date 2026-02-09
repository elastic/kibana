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

/** App-specific sidebar API with reactive params */
export interface UseSidebarAppApi<TParams = unknown> {
  /** Current params (reactive) */
  params: TParams;
  /** Update params (merges with existing) */
  setParams: (newParams: Partial<TParams>) => void;
  /** Open sidebar to this app */
  open: (openParams?: Partial<TParams>) => void;
  /** Close sidebar */
  close: () => void;
}

/** Hook for app-specific sidebar actions and state */
export function useSidebarApp<TParams = unknown>(appId: SidebarAppId): UseSidebarAppApi<TParams> {
  const sidebar = useSidebarService();
  const appApi = sidebar.getApp<TParams>(appId);

  const params = useObservable(appApi.getParams$(), appApi.getParams());

  const open = useCallback((openParams?: Partial<TParams>) => appApi.open(openParams), [appApi]);
  const close = useCallback(() => appApi.close(), [appApi]);
  const setParams = useCallback(
    (newParams: Partial<TParams>) => appApi.setParams(newParams),
    [appApi]
  );

  return useMemo(
    () => ({
      params,
      open,
      close,
      setParams,
    }),
    [params, open, close, setParams]
  );
}
