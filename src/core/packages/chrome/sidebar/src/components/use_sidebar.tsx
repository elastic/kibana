/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useObservable } from '@kbn/shared-ux-utility';
import { useSidebarService } from './sidebar_provider';

/**
 * Hook based API for interacting with the sidebar state
 */
export interface UseSidebarHook {
  isOpen: boolean;
  open: (appId: string) => void;
  close: () => void;

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

  return {
    isOpen,
    width,
    open: useCallback((appId: string) => sidebar.open(appId), [sidebar]),
    close: useCallback(() => sidebar.close(), [sidebar]),
    setWidth: useCallback((_width: number) => sidebar.setWidth(_width), [sidebar]),
  };
}
