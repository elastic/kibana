/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useContext, useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import deepEqual from 'fast-deep-equal';
import type { Observable } from 'rxjs';
import type { IUserStorageClient, UserStorageValue } from './types';
import { UserStorageContext } from './user_storage_context';

const PROVIDER_MISSING_MESSAGE =
  'useUserStorage / useUserStorageClient must be used inside a <UserStorageProvider>. ' +
  'Wrap your component tree in <UserStorageProvider userStorage={core.userStorage}>.';

/**
 * Returns the {@link IUserStorageClient} provided by the nearest
 * {@link UserStorageProvider}. Throws if no provider is mounted in the tree.
 *
 * @public
 */
export const useUserStorageClient = (): IUserStorageClient => {
  const client = useContext(UserStorageContext);
  if (!client) {
    throw new Error(PROVIDER_MISSING_MESSAGE);
  }
  return client;
};

export type UserStorageSetter<T> = (newValue: T) => Promise<T>;

/**
 * Load state of the value returned by {@link useUserStorage}, mirroring
 * {@link UserStorageValue}'s `status` without repeating its `value`.
 *
 * - `'loading'`: a non-preloaded key's lazy fetch hasn't resolved yet — the
 *   returned value is a temporary fallback/default, not the true stored value.
 * - `'resolved'`: the returned value is the true effective value.
 * - `'error'`: the lazy fetch failed; `error` describes the failure. The
 *   returned value is still the fallback/default — safe to display, but
 *   consumers should avoid enabling destructive actions while in this state.
 *
 * @public
 */
export type UserStorageHookState =
  | { status: 'loading' }
  | { status: 'resolved' }
  | { status: 'error'; error: Error };

/**
 * Subscribes to a single user-storage key and returns a `[value, setter, state]`
 * tuple. The value re-renders on every cache change; `state.status` lets
 * callers distinguish a temporary fallback (`'loading'`) from the resolved
 * value, and disable destructive actions until it settles. The setter
 * persists via HTTP and updates the cache on success.
 *
 * When called without a `defaultValue` the first element of the tuple is
 * `T | undefined` — it is `undefined` when the key has no cached value.
 * When called with a `defaultValue` it is always `T`.
 *
 * @example
 * ```tsx
 * const [layout, setLayout, { status }] = useUserStorage<NavLayout>(
 *   'navigation:layout',
 *   defaultLayout
 * );
 * ```
 *
 * @public
 */
export function useUserStorage<T = unknown>(
  key: string
): [T | undefined, UserStorageSetter<T>, UserStorageHookState];
export function useUserStorage<T = unknown>(
  key: string,
  defaultValue: T
): [T, UserStorageSetter<T>, UserStorageHookState];
export function useUserStorage<T = unknown>(
  key: string,
  defaultValue?: T
): [T | undefined, UserStorageSetter<T>, UserStorageHookState] {
  const client = useUserStorageClient();

  // Stabilize by structural identity so an inline default literal doesn't re-subscribe each render.
  const defaultValueRef = useRef(defaultValue);
  if (!deepEqual(defaultValueRef.current, defaultValue)) {
    defaultValueRef.current = defaultValue;
  }
  const stableDefault = defaultValueRef.current;

  const state$: Observable<UserStorageValue<T | undefined>> = useMemo(
    () =>
      stableDefault !== undefined
        ? client.getState$<T>(key, stableDefault)
        : client.getState$<T>(key),
    [client, key, stableDefault]
  );

  // peek() is side-effect-free, so it's safe as the initial render value under concurrent mode.
  const initialValue =
    stableDefault !== undefined ? client.peek<T>(key, stableDefault) : client.peek<T>(key);
  const state = useObservable<UserStorageValue<T | undefined>>(state$, {
    status: 'loading',
    value: initialValue,
  });

  const set = useCallback<UserStorageSetter<T>>(
    (newValue) => client.set<T>(key, newValue),
    [client, key]
  );

  const hookState: UserStorageHookState =
    state.status === 'error' ? { status: 'error', error: state.error } : { status: state.status };

  return [state.value, set, hookState];
}
