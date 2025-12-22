/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import { useObservable } from '@kbn/use-observable';
import { useSidebarAppStateService } from '../providers';
import { useSidebar } from './use_sidebar';

interface SetState<T> {
  (state: T, merge: false): void;
  (state: Partial<T>, merge?: true): void;
}

/**
 * Factory hook for a sidebar app. Returns specialized hooks and actions.
 *
 * @example
 * const counterApp = useSidebarApp<CounterState>('counter');
 *
 * function Component() {
 *   // Subscribe to state (re-renders on change)
 *   const { state } = counterApp.useState();
 *
 *   // Subscribe to field only (re-renders when field changes)
 *   const counter = counterApp.useSelector(s => s.counter);
 *
 *   // Actions never cause re-renders
 *   return <button onClick={() => counterApp.setState({ counter: 0 })}>Reset</button>;
 * }
 */
export function useSidebarApp<T>(appId: string) {
  const appState = useSidebarAppStateService();
  const { open, close } = useSidebar();

  const setState: SetState<T> = useCallback(
    (newState: T | Partial<T>, merge: boolean = true) => {
      if (merge) {
        appState.set<T>(appId, newState as Partial<T>, true);
      } else {
        appState.set<T>(appId, newState as T, false);
      }
    },
    [appId, appState]
  );

  const openApp = useCallback(() => {
    open(appId);
  }, [appId, open]);

  return useMemo(
    () => ({
      setState,
      open: openApp,
      close,
      /**
       * Check if the app is currently open
       */
      useIsOpen: () => {
        const { currentAppId, isOpen: sidebarIsOpen } = useSidebar();
        return sidebarIsOpen && currentAppId === appId;
      },

      /**
       * Subscribe to full app state. Re-renders on any state change.
       */
      useSnapshot: () => {
        const state = useObservable<T>(appState.get$<T>(appId), appState.get<T>(appId));
        return state;
      },

      /**
       * Subscribe to derived value. Only re-renders when selected value changes.
       */
      useSelector<K>(selector: (state: T) => K, isEqual?: (a: K, b: K) => boolean): K {
        const selected$ = useMemo(
          () =>
            appState.get$<T>(appId).pipe(
              map((state) => selector(state)),
              distinctUntilChanged(isEqual)
            ),
          [selector, isEqual]
        );

        const initialValue = useMemo(() => selector(appState.get<T>(appId)), [selector]);

        return useObservable(selected$, initialValue);
      },
    }),
    [appState, appId, setState, openApp, close]
  );
}
