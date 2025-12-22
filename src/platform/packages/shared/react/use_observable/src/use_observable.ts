/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

const isDev = process.env.NODE_ENV !== 'production';

export interface ObservableLike<T> {
  subscribe: (listener: (value: T) => void) => {
    unsubscribe: () => void;
  };
}

// RxJS BehaviorSubject fits this shape (getValue or value)
export interface BehaviorSubjectLike<T> extends ObservableLike<T> {
  getValue?: () => T;
  value?: T;
}

/**
 * This is a better version of react-use/lib/useObservable that:
 *  - works smoother with BehaviorSubjects (no double render on mount) and no need for initialValue
 *  - uses useSyncExternalStore under the hood
 *  - warns if observable$ identity changes between renders
 * @param observable$
 */
export function useObservable<T>(observable$: BehaviorSubjectLike<T>): T;
export function useObservable<T>(observable$: ObservableLike<T>): T | undefined;
export function useObservable<T>(observable$: ObservableLike<T>, initialValue: T): T;
export function useObservable<T>(observable$: ObservableLike<T>, initialValue?: T): T | undefined {
  if (isDev) {
    // Dev-only warning when observable$ identity changes.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const prevObservableRef = useRef<ObservableLike<T> | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (prevObservableRef.current && prevObservableRef.current !== observable$) {
        // eslint-disable-next-line no-console
        console.warn(
          'useObservable: observable$ instance changed between renders. ' +
            'This causes a resubscribe. Prefer a stable reference (e.g. useMemo/useRef).'
        );
      }
      prevObservableRef.current = observable$;
    }, [observable$]);
  }

  // For non-subject observables we hold the current value here.
  // Seed once from initialValue for the first observable instance.
  const valueRef = useRef<T | undefined>(initialValue);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (isBehaviorSubjectLike(observable$)) {
        // BehaviorSubject-like: React just listens; state lives in the subject.
        const subscription = observable$.subscribe(() => {
          onStoreChange();
        });
        return () => subscription.unsubscribe();
      }

      // Plain observable: we own the state.
      // Each time we subscribe to a (possibly new) observable$, reset to initialValue.
      valueRef.current = initialValue as T | undefined;
      onStoreChange();

      const subscription = observable$.subscribe((value) => {
        if (!Object.is(valueRef.current, value)) {
          valueRef.current = value;
          onStoreChange();
        }
      });

      return () => subscription.unsubscribe();
    },
    // IMPORTANT: do NOT include initialValue here.
    // Changing initialValue alone must not resubscribe or reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [observable$]
  );

  const getSnapshot = useCallback(() => {
    if (isBehaviorSubjectLike(observable$)) {
      // Always read from the subject itself.
      return readSubjectValue(observable$) as T | undefined;
    }
    // Plain observable: read from our ref.
    return valueRef.current as T | undefined;
  }, [observable$]);

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // server snapshot; OK to use same logic
  );

  return value as T | undefined;
}

function isBehaviorSubjectLike<T>(
  observable$: ObservableLike<T>
): observable$ is BehaviorSubjectLike<T> {
  const o = observable$ as any;
  return typeof o.getValue === 'function' || 'value' in o;
}

function readSubjectValue<T>(subject: BehaviorSubjectLike<T>): T {
  if (typeof subject.getValue === 'function') {
    return subject.getValue();
  }
  return subject.value as T;
}
