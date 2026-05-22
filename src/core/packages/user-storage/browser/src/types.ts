/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

/**
 * An update emission published when a stored value changes.
 *
 * Use the `type` discriminant to distinguish a value write (`'set'`) from a
 * user-override removal (`'remove'`). The `'remove'` variant has no `newValue`
 * because the effective value reverts to the registered default — callers
 * should read the post-removal state via `get()` if needed.
 *
 * @public
 */
export type UserStorageUpdate<T = unknown> =
  | { type: 'set'; key: string; newValue: T; oldValue: T | undefined }
  | { type: 'remove'; key: string; oldValue: T | undefined };

/**
 * Browser-side user storage client. Returns synchronously from an in-memory
 * cache that is seeded from preloaded (server-injected) metadata at first
 * paint, and is refreshed by `set` / `remove` after the corresponding HTTP
 * write completes.
 *
 * Distinct from the server-side `IUserStorageClient` (in
 * `@kbn/core-user-storage-common`) which is fully Promise-based.
 *
 * @public
 */
export interface IUserStorageClient {
  /**
   * Pure synchronous read from the local cache with no side effects.
   * Returns `undefined` when no cached value exists for the key and no
   * `defaultValue` is provided.
   *
   * Unlike `get`, `peek` never triggers a lazy fetch, making it safe to
   * call during React render (which may be invoked multiple times before
   * a commit under concurrent mode).
   */
  peek<T = unknown>(key: string): T | undefined;
  peek<T = unknown>(key: string, defaultValue: T): T;

  /**
   * Synchronous read from the local cache. Returns `undefined` when no cached
   * value exists for the key and no `defaultValue` is provided.
   *
   * For keys without `preload: true`, the first call for an uncached key
   * triggers a fire-and-forget lazy HTTP fetch in the background. Prefer
   * `peek` in render functions; use `get` in imperative / effect code where
   * triggering the fetch on first access is the intended behaviour.
   */
  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, defaultValue: T): T;

  /**
   * Observable that emits the current cached value followed by every future
   * value seen for the given key. Emits `undefined` when no cached value
   * exists and no `defaultValue` is provided. Suitable for React subscriptions.
   */
  get$<T = unknown>(key: string): Observable<T | undefined>;
  get$<T = unknown>(key: string, defaultValue: T): Observable<T>;

  /**
   * Persists a new value via `PUT /internal/user_storage/{key}`. Returns the
   * server-validated form of the value (after any Zod transforms or stripping),
   * which is also what gets cached locally. On HTTP failure the cache is left
   * untouched, the error is published to `getHttpError$`, and the promise rejects.
   */
  set<T = unknown>(key: string, value: T): Promise<T>;

  /**
   * Removes the user override via `DELETE /internal/user_storage/{key}`.
   * On success the cached value is deleted (subsequent reads fall back to
   * `defaultValue`) and subscribers are notified.
   */
  remove(key: string): Promise<void>;

  /**
   * Stream of every successful key update (write or remove).
   * Does **not** emit for lazy-fetch cache hydrations.
   */
  getUpdate$(): Observable<UserStorageUpdate>;

  /**
   * Stream of HTTP errors raised by `set`, `remove`, or lazy-fetch calls.
   * Suitable for centralised toast / telemetry handling.
   */
  getHttpError$(): Observable<Error>;
}
