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
 * Load state for a lazily-fetched key, as emitted by {@link IUserStorageClient.getState$}.
 *
 * - `'loading'`: the effective value is not yet known; `value` is the caller-supplied
 *   fallback/default and should not be treated as the real stored value.
 * - `'resolved'`: `value` is the true effective value (stored override or registered default).
 * - `'error'`: the lazy fetch failed; `value` is the fallback/default and `error` describes
 *   the failure. Safe to display, but destructive/write actions should stay disabled.
 *
 * @public
 */
export type UserStorageValue<T> =
  | { status: 'loading'; value: T }
  | { status: 'resolved'; value: T }
  | { status: 'error'; value: T; error: Error };

/**
 * Browser-side user storage client, backed by an in-memory cache that is
 * seeded from preloaded (server-injected) metadata at first paint and
 * refreshed by `set` / `remove` after the corresponding HTTP write completes.
 *
 * `peek` is the only purely synchronous read (cache-only, no side effects).
 * `get`, `get$`, and `getState$` may trigger a lazy HTTP fetch for keys that
 * were not preloaded; `get` and `update` are `Promise`-based so they can await
 * that fetch, while `get$` / `getState$` surface it reactively.
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
   * sequence, or prefer {@link update} which does this for you.
   */
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultValue: T): Promise<T>;

  /**
   * Observable that emits the current cached value followed by every future
   * value seen for the given key. Emits `undefined` when no cached value
   * exists and no `defaultValue` is provided. Suitable for React subscriptions.
   *
   * The first emission is a synchronous cache snapshot (like `peek`) — it may be
   * a temporary default for a non-preloaded key that hasn't hydrated yet. Use
   * {@link getState$} if you need to distinguish that from a resolved value.
   */
  get$<T = unknown>(key: string): Observable<T | undefined>;
  get$<T = unknown>(key: string, defaultValue: T): Observable<T>;

  /**
   * Observable load-state stream for a key: emits `{status:'loading', value: default}`
   * immediately if the key isn't cached yet (triggering the lazy fetch), then
   * `{status:'resolved', value}` once hydrated, or `{status:'error', value: default, error}`
   * if the fetch fails. If already cached, emits `{status:'resolved', value}` immediately.
   * Lets UI render a fallback while disabling destructive/write actions until resolved.
   */
  getState$<T = unknown>(key: string): Observable<UserStorageValue<T | undefined>>;
  getState$<T = unknown>(key: string, defaultValue: T): Observable<UserStorageValue<T>>;

  /**
   * Persists a new value via `PUT /internal/user_storage/{key}`. Returns the
   * server-validated form of the value (after any Zod transforms or stripping),
   * which is also what gets cached locally. On HTTP failure the cache is left
   * untouched, the error is published to `getHttpError$`, and the promise rejects.
   *
   * Rejects without issuing a request when `isAvailable()` is `false`.
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
   * Safe read-modify-write helper for structured values behind a lazy key.
   * Awaits the resolved current value (see `get`), applies `updater`, and
   * persists the result via `set` — so the mutation is always computed from
   * the true stored value, never an unhydrated default.
   *
   * If `updater` returns the exact same reference it was given, `update`
   * treats the call as a no-op and skips the HTTP write, returning the
   * unchanged current value.
   *
   * This is a single resolved-read-then-write; it does not detect or retry
   * on concurrent writers (last write wins, same as `set`).
   */
  update<T = unknown>(key: string, defaultValue: T, updater: (current: T) => T): Promise<T>;

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
