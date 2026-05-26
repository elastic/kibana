/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
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
 * tuple. The value reflects the synchronous cache and re-renders on change.
 * The setter persists via HTTP and updates the cache on success.
 *
 * When called without a `defaultValue` the first element of the tuple is
 * `T | undefined` — it is `undefined` when the key has no cached value.
 * When called with a `defaultValue` it is always `T`.
 *
 * @example
 * ```tsx
 * const [layout, setLayout] = useUserStorage<NavLayout>(
 *   'navigation:layout',
 *   defaultLayout
 * );
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

  const observable$: Observable<T | undefined> = useMemo(
    () => (defaultValue !== undefined ? client.get$<T>(key, defaultValue) : client.get$<T>(key)),
    [client, key, defaultValue]
  );
  // Use peek (pure, no side effects) for the synchronous initial render value.
  // The lazy fetch is triggered by the get$() subscription inside useObservable,
  // which runs inside an effect after the first commit — safe under concurrent mode.
  const value = useObservable<T | undefined>(
    observable$,
    defaultValue !== undefined ? client.peek<T>(key, defaultValue) : client.peek<T>(key)
  );
  const set = useCallback<UserStorageSetter<T>>(
    (newValue) => client.set<T>(key, newValue),
    [client, key]
  );

  return [value, set];
}
