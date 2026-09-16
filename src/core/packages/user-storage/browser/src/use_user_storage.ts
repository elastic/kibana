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
import type { IUserStorageClient } from './types';
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
 * Subscribes to a single user-storage key and returns a `[value, setter]`
 * tuple. The value re-renders on every cache change; the setter persists via
 * HTTP and updates the cache on success.
 *
 * When called without a `defaultValue` the first element of the tuple is
 * `T | undefined` — it is `undefined` when the key has no cached value.
 * When called with a `defaultValue` it is always `T`.
 *
 * For a `preload: false` key the value is the default until the lazy fetch
 * resolves, and stays the default if that fetch fails. Read through
 * `useUserStorageClient().get()` when a caller must tell a placeholder apart
 * from a stored value, or observe a failed read.
 *
 * @example
 * ```tsx
 * const [layout, setLayout] = useUserStorage<NavLayout>('navigation:layout', defaultLayout);
 * ```
 *
 * @public
 */
export function useUserStorage<T = unknown>(key: string): [T | undefined, UserStorageSetter<T>];
export function useUserStorage<T = unknown>(
  key: string,
  defaultValue: T
): [T, UserStorageSetter<T>];
export function useUserStorage<T = unknown>(
  key: string,
  defaultValue?: T
): [T | undefined, UserStorageSetter<T>] {
  const client = useUserStorageClient();

  // Stabilize by structural identity so an inline default literal doesn't re-subscribe each render.
  const defaultValueRef = useRef(defaultValue);
  if (!deepEqual(defaultValueRef.current, defaultValue)) {
    defaultValueRef.current = defaultValue;
  }
  const stableDefault = defaultValueRef.current;

  const value$: Observable<T | undefined> = useMemo(
    () => (stableDefault !== undefined ? client.get$<T>(key, stableDefault) : client.get$<T>(key)),
    [client, key, stableDefault]
  );

  // peek() is side-effect-free, so it's safe to read during render under concurrent mode.
  // It supplies the pre-subscription value; a preloaded key is already correct on first render.
  const cached = client.peek<T>(key);
  const value = useObservable<T | undefined>(value$, cached !== undefined ? cached : stableDefault);

  const set = useCallback<UserStorageSetter<T>>(
    (newValue) => client.set<T>(key, newValue),
    [client, key]
  );

  return [value, set];
}
