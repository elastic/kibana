/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChromeState, ChromeStore } from './chrome_store';
import { ChromeStoreContext } from './chrome_store_provider';

// Hook to use the store
function useChromeStore(): ChromeStore {
  const context = useContext(ChromeStoreContext);
  if (!context) {
    throw new Error('useChromeStore must be used within a ChromeStoreProvider');
  }
  return context;
}

const isBehaviorSubject = <T,>(o: unknown): o is BehaviorSubject<T> =>
  !!o && typeof (o as any).getValue === 'function';

/**
 * Subscribe to an RxJS observable with React 18's useSyncExternalStore.
 *
 * Overloads:
 * - If you pass an initialValue, you'll always get T.
 * - If you don't, the return type can be T | undefined.
 */
export function useObservable<T>(source$: Observable<T>, initialValue: T): T;
export function useObservable<T>(source$: Observable<T>): T | undefined;
export function useObservable<T>(source$: Observable<T>, initialValue?: T) {
  // Compute initial once
  const initialRef = useRef<T | undefined>();
  if (initialRef.current === undefined) {
    initialRef.current =
      initialValue !== undefined
        ? initialValue
        : isBehaviorSubject<T>(source$)
        ? source$.getValue()
        : undefined;
  }

  // Store the latest emitted value
  const valueRef = useRef<T | undefined>(initialRef.current);

  const subscribe = useCallback(
    (notify: () => void) => {
      const sub = source$.subscribe((value) => {
        if (valueRef.current !== value) {
          valueRef.current = value;
          notify();
        }
      });
      return () => sub.unsubscribe();
    },
    [source$]
  );

  const getSnapshot = useCallback(() => valueRef.current as T, []);
  const getServerSnapshot = useCallback(() => initialRef.current as T, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
/** Overloads:
 * 1) Selector -> BehaviorSubject<T>              => returns T
 * 2) Selector -> Observable<T>, with initialValue => returns T
 * 3) Selector -> Observable<T>, without initial   => returns T | undefined
 */
export function useChromeObservable<T>(selector: (s: ChromeState) => BehaviorSubject<T>): T;
export function useChromeObservable<T>(
  selector: (s: ChromeState) => Observable<T>,
  initialValue: T
): T;
export function useChromeObservable<T>(selector: (s: ChromeState) => Observable<T>): T | undefined;
export function useChromeObservable<T>(
  selector: (s: ChromeState) => Observable<T>,
  initialValue?: T
) {
  const store = useChromeStore();
  const observable$ = useMemo(
    () => selector(store),
    // intentionally don't include `selector` here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  );
  return useObservable(observable$, initialValue);
}

export function useChromeValue<T>(selector: (s: ChromeState) => T): T {
  const store = useChromeStore();
  return selector(store);
}
