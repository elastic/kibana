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
import { useSidebarAppStateService } from '../providers';
import { useSidebar } from './use_sidebar';

/**
 * Return type for useSidebarApp hook
 */
export interface UseSidebarAppResult<T> {
  state: T;
  setState: {
    (state: T, merge: false): void;
    (state: Partial<T>, merge?: true): void;
  };

  open: () => void;
  close: () => void;
  isOpen: boolean;
}

/**
 * React hook for accessing sidebar app state and actions
 * @param appId
 */
export function useSidebarApp<T>(appId: string): UseSidebarAppResult<T> {
  const appState = useSidebarAppStateService();
  const { open, close, currentAppId, isOpen } = useSidebar();

  const state = useObservable<T>(appState.get$<T>(appId), appState.get<T>(appId));

  const setState = useCallback(
    (newState: T | Partial<T>, merge: boolean = true) => {
      if (merge) {
        appState.set<T>(appId, newState as Partial<T>, true);
      } else {
        appState.set<T>(appId, newState as T, false);
      }
    },
    [appState, appId]
  ) as UseSidebarAppResult<T>['setState'];

  const openApp = useCallback(() => {
    open(appId);
  }, [open, appId]);

  const isAppOpen = isOpen && currentAppId === appId;

  return useMemo(
    () => ({ state, setState, open: openApp, close, isOpen: isAppOpen }),
    [state, setState, openApp, close, isAppOpen]
  );
}
