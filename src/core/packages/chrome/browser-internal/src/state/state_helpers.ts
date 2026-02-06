/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';

export interface State<T> {
  /** Stable observable - same reference every call */
  $: Observable<T>;
  /** Raw BehaviorSubject for derived observables */
  subject$: BehaviorSubject<T>;
  /** Get current value synchronously */
  get: () => T;
  /** Set new value */
  set: (value: T) => void;
  /** Update value using transformer function */
  update: (fn: (current: T) => T) => void;
}

export interface ArrayState<T> extends State<T[]> {
  /** Add item to array */
  add: (item: T) => void;
  /** Add item and sort */
  addSorted: (item: T, compareFn: (a: T, b: T) => number) => void;
  /** Remove items matching predicate */
  remove: (predicate: (item: T) => boolean) => void;
  /** Clear all items */
  clear: () => void;
}

/** State persisted to localStorage */
export interface PersistedState<T> extends State<T> {
  /** Clear from localStorage and reset to initial value */
  reset: () => void;
}

export function createState<T>(initialValue: T): State<T> {
  const subject$ = new BehaviorSubject<T>(initialValue);

  return {
    $: subject$.asObservable(),
    subject$,
    get: () => subject$.getValue(),
    set: (value: T) => subject$.next(value),
    update: (fn: (current: T) => T) => subject$.next(fn(subject$.getValue())),
  };
}

export function createArrayState<T>(initialValue: T[] = []): ArrayState<T> {
  const base = createState(initialValue);

  return {
    ...base,
    add: (item: T) => base.update((items) => [...items, item]),
    addSorted: (item: T, compareFn) => base.update((items) => [...items, item].sort(compareFn)),
    remove: (predicate) => base.update((items) => items.filter((item) => !predicate(item))),
    clear: () => base.set([]),
  };
}

export function createPersistedState<T>(
  key: string,
  initialValue: T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (raw: string) => T = JSON.parse
): PersistedState<T> {
  const stored = localStorage.getItem(key);
  let startValue = initialValue;
  if (stored !== null) {
    try {
      startValue = deserialize(stored);
    } catch {
      // Corrupt or unparseable value in localStorage -- fall back to initial value
      startValue = initialValue;
    }
  }
  const base = createState(startValue);

  const persistedState: PersistedState<T> = {
    ...base,
    set: (value: T) => {
      try {
        localStorage.setItem(key, serialize(value));
      } catch {
        // Ignore storage errors (quota, disabled storage, etc.)
      }
      base.set(value);
    },
    update: (fn) => {
      persistedState.set(fn(base.get()));
    },
    reset: () => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage errors (quota, disabled storage, etc.)
      }
      base.set(initialValue);
    },
  };

  return persistedState;
}
