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
 * Browser-side user storage client: an in-memory cache seeded from
 * server-injected values at first paint, with HTTP-backed writes.
 *
 * Choosing a read:
 * - `get$` for anything rendered; React should use the `useUserStorage` hook.
 * - `get` when the value must be resolved before acting on it.
 * - `peek` for a synchronous snapshot, safe to call during render.
 *
 * Distinct from the server-side `IUserStorageClient` (in
 * `@kbn/core-user-storage-common`), which is Promise-based for every method.
 *
 * @public
 */
export interface IUserStorageClient {
  /**
   * Whether user storage is usable for the current user: `false` for anonymous
   * users, users without a `profile_uid`, or when the auth realm denies access to
   * user-storage saved objects. Fixed at page render; it never changes afterwards.
   *
   * Gate save/delete affordances on this. Reads need no guard - when `false` they
   * resolve to their `defaultValue` without issuing a request.
   */
  isAvailable(): boolean;

  /**
   * Synchronous cache-only read; never triggers a fetch. Returns `undefined` when
   * the key has no cached value and no `defaultValue` is given.
   *
   * Always correct for `preload: true` keys. For a `preload: false` key it returns
   * the `defaultValue` until the fetch lands, so never use it as a write base.
   */
  peek<T = unknown>(key: string): T | undefined;
  peek<T = unknown>(key: string, defaultValue: T): T;

  /**
   * Resolves once the effective value is known, awaiting the lazy fetch for a
   * `preload: false` key. Rejects if that fetch fails.
   */
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultValue: T): Promise<T>;

  /**
   * Emits the current value, then again on every hydration and write.
   *
   * The first emission is a synchronous cache snapshot, so it may be the
   * `defaultValue` for a key that has not hydrated. A failed fetch neither errors
   * nor completes the stream - subscribers stay on the default.
   */
  get$<T = unknown>(key: string): Observable<T | undefined>;
  get$<T = unknown>(key: string, defaultValue: T): Observable<T>;

  /**
   * Persists a value and caches the server-validated result (post Zod
   * transform/strip), which is what this resolves with. On failure the cache is
   * untouched and the promise rejects. Rejects without a request when
   * `isAvailable()` is `false`.
   *
   * Writes are last-write-wins; concurrent tabs do not merge. Build the new value
   * from `await get(key, default)`, never from `peek(key)`, or an unhydrated read
   * will overwrite what the user had stored.
   */
  set<T = unknown>(key: string, value: T): Promise<T>;

  /**
   * Removes the user override. The cached value is deleted and `get$` subscribers
   * re-emit the registered default. Rejects without a request when
   * `isAvailable()` is `false`.
   */
  remove(key: string): Promise<void>;

  /**
   * HTTP errors from `set`, `remove`, or a lazy fetch, for centralised toast or
   * telemetry handling. The only channel for a fetch failure, since `get$` is
   * silent on one. A failed `set`/`remove` also rejects its own promise, so report
   * it in one place or the other.
   */
  getHttpError$(): Observable<Error>;
}
