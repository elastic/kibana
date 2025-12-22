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
export interface UseSidebarResult {
  isOpen: boolean;
  open: (appId: string) => void;
  close: () => void;
  setWidth: (width: number) => void;
  currentAppId: string | null;
}

/**
 * React hook for accessing the sidebar state and actions
 */
export function useSidebar(): UseSidebarResult {
  const sidebar = useSidebarService().state;

  const isOpen = useObservable(sidebar.isOpen$, sidebar.isOpen());
  const currentAppId = useObservable(sidebar.currentAppId$, sidebar.getCurrentAppId());

  const open = useCallback((appId: string) => sidebar.open(appId), [sidebar]);
  const close = useCallback(() => sidebar.close(), [sidebar]);
  const setWidth = useCallback((newWidth: number) => sidebar.setWidth(newWidth), [sidebar]);

  return useMemo(
    () => ({
      isOpen,
      currentAppId,
      open,
      close,
      setWidth,
    }),
    [isOpen, currentAppId, open, close, setWidth]
  );
}

/**
 * React hook for accessing the sidebar width
 */
export function useSidebarWidth(): number {
  const sidebar = useSidebarService().state;
  return useObservable(sidebar.width$, sidebar.getWidth());
}
