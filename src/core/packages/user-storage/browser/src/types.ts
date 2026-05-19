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
 * cache that is seeded from server-injected metadata at first paint, and is
 * refreshed by `set` / `remove` after the corresponding HTTP write completes.
 *
 * Distinct from the server-side `IUserStorageClient` (in
 * `@kbn/core-user-storage-common`) which is fully Promise-based.
 *
 * @public
 */
export interface IUserStorageClient {
  /**
   * Synchronous read from the local cache. Returns `undefined` when no cached
   * value exists for the key and no `defaultValue` is provided.
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
   * Persists a new value via `PUT /internal/user_storage/{key}`. On success
   * the local cache is updated and subscribers to `get$` / `getUpdate$` are
   * notified. On HTTP failure the cache is left untouched, the error is
   * published to `getHttpError$`, and the returned promise rejects.
   */
  set<T = unknown>(key: string, value: T): Promise<void>;

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
