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
export declare function useUserStorage<T = unknown>(key: string): [T | undefined, UserStorageSetter<T>];
export declare function useUserStorage<T = unknown>(key: string, defaultValue: T): [T, UserStorageSetter<T>];
