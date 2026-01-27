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
    useUnstableObservableWarning(observable$);
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

/**
 * Development-only hook that warns when an observable reference changes
 * on consecutive renders, indicating a missing useMemo() or unstable reference.
 *
 * Tracks committed renders (not render phase) to handle React StrictMode correctly.
 */
function useUnstableObservableWarning<T>(observable$: Observable<T>): void {
  // Capture observable in render phase (last write wins before commit)
  const pendingRef = useRef(observable$);
  pendingRef.current = observable$;

  // All tracking state in a single ref to avoid multiple refs
  const trackingRef = useRef({
    committedObservable: undefined as Observable<T> | undefined,
    consecutiveChanges: 0,
    hasWarned: false,
  });

  useEffect(() => {
    const tracking = trackingRef.current;
    const current = pendingRef.current;

    // First commit: initialize and exit
    if (tracking.committedObservable === undefined) {
      tracking.committedObservable = current;
      return;
    }

    // Update consecutive change counter
    const didChange = tracking.committedObservable !== current;
    tracking.consecutiveChanges = didChange ? tracking.consecutiveChanges + 1 : 0;
    tracking.committedObservable = current;

    // Warn after 3 consecutive changes
    if (tracking.consecutiveChanges >= 3 && !tracking.hasWarned) {
      tracking.hasWarned = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[useObservable] Observable reference changed on 3+ consecutive renders.\n\n' +
          'This causes repeated subscribe/unsubscribe cycles. To fix:\n' +
          '  • useMemo(() => createObservable(dep), [dep])\n' +
          '  • Move observable creation outside the component\n' +
          '  • Use a stable reference from a store or context'
      );
    }
  });
}

function hasGetValue<T>(obs: Observable<T>): obs is ValueObservable<T> {
  return typeof obs === 'object' && obs !== null && typeof (obs as any).getValue === 'function';
}
