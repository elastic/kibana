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
 * Browser-side user storage client, backed by an in-memory cache that is
 * seeded from preloaded (server-injected) metadata at first paint and
 * refreshed by `set` / `remove` after the corresponding HTTP write completes.
 *
 * `peek` is the only purely synchronous read (cache-only, no side effects).
 * `get` and `get$` may trigger a lazy HTTP fetch for keys that were not
 * preloaded; `get` is `Promise`-based so it can await that fetch, while `get$`
 * surfaces it reactively.
 *
 * Distinct from the server-side `IUserStorageClient` (in
 * `@kbn/core-user-storage-common`), which is fully Promise-based for every
 * method, including single-key reads.
 *
 * @public
 */
export interface IUserStorageClient {
  /**
   * Whether user storage is available for the current user/session: `false` for
   * anonymous users, users without a `profile_uid`, or when the auth realm denies
   * access to user-storage saved objects. A single condition gates both read
   * preloading and writes. A static, page-render-time signal — does not change
   * over the lifetime of a page load.
   *
   * Gate save/delete affordances on this rather than querying user profile state
   * directly. Reads need no guard: when `false` they resolve to their `defaultValue`
   * without issuing a request.
   */
  isAvailable(): boolean;

  /**
   * Pure synchronous read from the local cache with no side effects.
   * Returns `undefined` when no cached value exists for the key and no
   * `defaultValue` is provided.
   *
   * Unlike `get`, `peek` never triggers a lazy fetch, making it safe to
   * call during React render (which may be invoked multiple times before
   * a commit under concurrent mode). Also useful for `preload: true` keys,
   * which are always cached at first paint, and for best-effort snapshots
   * where triggering a fetch is not wanted.
   */
  peek<T = unknown>(key: string): T | undefined;
  peek<T = unknown>(key: string, defaultValue: T): T;

  /**
   * Safe, async resolved read: resolves only once the effective value is known.
   *
   * If the key is already cached (preloaded, or a prior lazy fetch already
   * hydrated it), resolves immediately. Otherwise triggers (or awaits an
   * already-triggered) lazy HTTP fetch and resolves once it completes. Rejects
   * if the fetch fails — callers should not build subsequent writes on a failed
   * read. Use this (not `peek`) as the read half of any read-modify-write
   * sequence — see {@link set}.
   */
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultValue: T): Promise<T>;

  /**
   * Observable that emits the current cached value followed by every future
   * value seen for the given key. Emits `undefined` when no cached value
   * exists and no `defaultValue` is provided. Suitable for React subscriptions.
   *
   * The first emission is a synchronous cache snapshot (like `peek`) — it may be
   * a temporary default for a non-preloaded key that hasn't hydrated yet, followed
   * by the hydrated value once the fetch resolves. A failed fetch neither errors
   * nor completes the stream; use `get()` when a read failure must be observed.
   */
  get$<T = unknown>(key: string): Observable<T | undefined>;
  get$<T = unknown>(key: string, defaultValue: T): Observable<T>;

  /**
   * Persists a new value via `PUT /internal/user_storage/{key}`. Returns the
   * server-validated form of the value (after any Zod transforms or stripping),
   * which is also what gets cached locally. On HTTP failure the cache is left
   * untouched, the error is published to `getHttpError$`, and the promise rejects.
   *
   * Rejects without issuing a request when `isAvailable()` is `false`.
   *
   * For a read-modify-write, compute the new value from `await get(key, default)`
   * and never from `peek(key)`: on a `preload: false` key `peek` returns the
   * default until the lazy fetch lands, so writing back a `peek`-derived value
   * overwrites whatever the user already had stored. Note that this is a plain
   * last-write-wins write with no concurrency control — two tabs writing the same
   * key will not merge.
   */
  set<T = unknown>(key: string, value: T): Promise<T>;

  /**
   * Removes the user override via `DELETE /internal/user_storage/{key}`.
   * On success the cached value is deleted (subsequent reads fall back to
   * `defaultValue`) and subscribers are notified.
   *
   * Rejects without issuing a request when `isAvailable()` is `false`.
   */
  remove(key: string): Promise<void>;

  /**
   * Stream of HTTP errors raised by `set`, `remove`, or lazy-fetch calls.
   * Suitable for centralised toast / telemetry handling.
   */
  getHttpError$(): Observable<Error>;
}
