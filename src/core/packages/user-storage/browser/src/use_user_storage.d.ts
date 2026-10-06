/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUserStorageClient } from './types';
/**
 * Returns the {@link IUserStorageClient} provided by the nearest
 * {@link UserStorageProvider}. Throws if no provider is mounted in the tree.
 *
 * @public
 */
export declare const useUserStorageClient: () => IUserStorageClient;
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
export declare function useUserStorage<T = unknown>(
  key: string
): [T | undefined, UserStorageSetter<T>];
export declare function useUserStorage<T = unknown>(
  key: string,
  defaultValue: T
): [T, UserStorageSetter<T>];
