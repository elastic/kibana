/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore, useRef, useMemo, useEffect } from 'react';

const isDev = process.env.NODE_ENV !== 'production';

export interface Observable<T> {
  subscribe: (listener: (value: T) => void) => {
    unsubscribe: () => void;
  };
}

export interface ValueObservable<T> extends Observable<T> {
  getValue: () => T;
}

export function useObservable<T>(observable$: ValueObservable<T>): T;
export function useObservable<T>(observable$: Observable<T>, initialValue: T): T;
export function useObservable<T>(observable$: Observable<T>): T | undefined;
export function useObservable<T>(observable$: Observable<T>, initialValue?: T): T | undefined {
  if (isDev) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useObservableUnstableRefWarning(observable$);
  }

  const adapter = useMemo(() => {
    let currentValue: T | undefined = hasGetValue(observable$)
      ? observable$.getValue()
      : initialValue;

    return {
      subscribe: (notify: () => void) => {
        const sub = observable$.subscribe((nextValue) => {
          if (!Object.is(nextValue, currentValue)) {
            currentValue = nextValue;
            notify();
          }
        });
        return () => sub.unsubscribe();
      },
      getSnapshot: () => currentValue,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observable$]); // intentionally omit initialValue - only matters for initial subscription

  return useSyncExternalStore(adapter.subscribe, adapter.getSnapshot, adapter.getSnapshot);
}

// Dev only hook to detect changing observable refs
// and warn the developer about potential performance issues
function useObservableUnstableRefWarning<T>(observable$: Observable<T>): void {
  const renderCount = useRef(0);
  const changeCount = useRef(0);
  const prevObs = useRef<Observable<T>>();
  const hasWarned = useRef(false);

  useEffect(() => {
    renderCount.current++;

    if (prevObs.current !== undefined && prevObs.current !== observable$) {
      changeCount.current++;
    }
    prevObs.current = observable$;

    if (
      renderCount.current >= 3 &&
      changeCount.current === renderCount.current - 1 &&
      !hasWarned.current
    ) {
      hasWarned.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[useObservable] ⚠️ Performance Warning: The observable passed to useObservable is changing on every render.\n` +
          `This causes constant unsubscribing/resubscribing. Wrap the observable creation in useMemo() or extract from the component.`
      );
    }
  });
}

function hasGetValue<T>(obs: Observable<T>): obs is ValueObservable<T> {
  return typeof obs === 'object' && obs !== null && typeof (obs as any).getValue === 'function';
}
