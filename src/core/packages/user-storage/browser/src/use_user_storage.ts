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
import type { IUserStorageClient } from './types';
import { UserStorageContext } from './user_storage_context';

const PROVIDER_MISSING_MESSAGE =
  'useUserStorage / useUserStorageClient must be used inside a <UserStorageProvider>. ' +
  'Wrap your component tree in <UserStorageProvider client={core.userStorage}>.';

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

export type UserStorageSetter<T> = (newValue: T) => Promise<void>;

/**
 * Subscribes to a single user-storage key and returns a `[value, setter]`
 * tuple. The value reflects the synchronous cache and re-renders on change.
 * The setter persists via HTTP and updates the cache on success.
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
export const useUserStorage = <T = unknown>(
  key: string,
  defaultValue?: T
): [T, UserStorageSetter<T>] => {
  const client = useUserStorageClient();

  const observable$ = useMemo(() => client.get$<T>(key, defaultValue), [client, key, defaultValue]);
  const value = useObservable<T>(observable$, client.get<T>(key, defaultValue as T));
  const set = useCallback<UserStorageSetter<T>>(
    (newValue) => client.set<T>(key, newValue),
    [client, key]
  );

  return [value as T, set];
};
