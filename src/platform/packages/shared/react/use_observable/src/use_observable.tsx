/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

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

  const valueRef = useRef<T | undefined>(initialValue);

  const adapter = useMemo(() => {
    // For ValueObservable: sync immediately to avoid stale flash
    // For regular Observable: keep previous value (stale-while-revalidate)
    if (hasGetValue(observable$)) {
      valueRef.current = observable$.getValue();
    }

    return {
      subscribe: (notify: () => void) => {
        const sub = observable$.subscribe((nextValue) => {
          if (!Object.is(nextValue, valueRef.current)) {
            valueRef.current = nextValue;
            notify();
          }
        });
        return () => sub.unsubscribe();
      },
      getSnapshot: () => valueRef.current,
    };
  }, [observable$]);

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
