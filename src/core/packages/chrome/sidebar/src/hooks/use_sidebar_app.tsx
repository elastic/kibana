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

interface ActionContext<T> {
  get: () => T;
  set: SetState<T>;
  open: () => void;
  close: () => void;
}

export interface SidebarAppHooks<T, A> {
  useSelector<K>(selector: (state: T) => K, isEqual?: (a: K, b: K) => boolean): K;
  useSnapshot(): T;
  useIsOpen(): boolean;
  useActions(): A & ActionContext<T>;
}

/**
 * Creates specialized hooks and actions for a sidebar app.
 *
 * @example
 * // Define app hooks with actions
 * const counterApp = createSidebarAppHooks<CounterState>('counter')(({ get, set }) => ({
 *   increment: () => set({ counter: get().counter + 1 }),
 *   decrement: () => set({ counter: get().counter - 1 }),
 *   reset: () => set({ counter: 0 }),
 * }));
 *
 * // Define app hooks without actions
 * const simpleApp = createSidebarAppHooks<SimpleState>('simple')();
 *
 * // Use in components
 * function Counter() {
 *   const counter = counterApp.useSelector(s => s.counter);
 *   const { increment } = counterApp.useActions();
 *   return <button onClick={increment}>{counter}</button>;
 * }
 */
export function createSidebarAppHooks<T>(appId: string) {
  return function <A = {}>(createActions?: (ctx: ActionContext<T>) => A): SidebarAppHooks<T, A> {
    return {
      /**
       * Subscribe to derived value. Only re-renders when selected value changes.
       */
      useSelector<K>(selector: (state: T) => K, isEqual?: (a: K, b: K) => boolean): K {
        const appState = useSidebarAppStateService();

        const selected$ = useMemo(
          () =>
            appState.get$<T>(appId).pipe(
              map((state) => selector(state)),
              distinctUntilChanged(isEqual)
            ),
          [selector, isEqual, appState]
        );

        const initialValue = useMemo(() => selector(appState.get<T>(appId)), [selector, appState]);

        return useObservable(selected$, initialValue);
      },

      /**
       * Subscribe to full app state. **Causes re-renders on any state change.**
       */
      useSnapshot(): T {
        const appState = useSidebarAppStateService();
        return useObservable<T>(appState.get$<T>(appId), appState.get<T>(appId));
      },

      /**
       * Check if app is currently open.
       */
      useIsOpen(): boolean {
        const { currentAppId, isOpen } = useSidebar();
        return isOpen && currentAppId === appId;
      },

      /**
       * Get actions (never causes re-renders).
       */
      useActions(): A & ActionContext<T> {
        const appState = useSidebarAppStateService();
        const { open, close } = useSidebar();

        const get = useCallback(() => appState.get<T>(appId), [appState]);

        const set: SetState<T> = useCallback(
          (newState: T | Partial<T>, merge: boolean = true) => {
            if (merge) {
              appState.set<T>(appId, newState as Partial<T>, true);
            } else {
              appState.set<T>(appId, newState as T, false);
            }
          },
          [appState]
        );

        const openApp = useCallback(() => open(appId), [open]);

        const customActions = useMemo(() => {
          if (!createActions) return {} as A;
          return createActions({ get, set, open: openApp, close });
        }, [get, set, openApp, close]);

        return useMemo(
          () => ({ ...customActions, get, set, open: openApp, close }),
          [customActions, get, set, openApp, close]
        );
      },
    } as const;
  };
}
