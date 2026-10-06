/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';
import type { UserStorageApi } from './user_storage_api';
export interface UserStorageClientParams {
  api: UserStorageApi;
  initialValues: Record<string, unknown>;
  /** Whether user storage is available for the current user (see `IUserStorageClient.isAvailable`). */
  available: boolean;
  done$: Observable<unknown>;
}
/**
 * Browser-side {@link IUserStorageClient}: an in-memory cache seeded from
 * server-injected values for `preload: true` keys, with HTTP-backed writes and
 * per-key lazy fetching for the rest.
 *
 * - A cache miss on `get` / `get$` triggers one `GET` that concurrent callers
 *   for that key share.
 * - `cache[key] === undefined` means "not yet fetched": registration rejects
 *   schemas accepting `undefined`/`null` and requires a valid `defaultValue`,
 *   so a hydrated entry is never `undefined`.
 * - Fetch failures go to `getHttpError$` and leave the cache absent so the next
 *   read retries. `get()` rejects; `get$` neither errors nor completes, so a
 *   subscriber stays on its default until a later read succeeds.
 * - `get$` re-emits on `set`/`remove` and on lazy hydration.
 * - When `isAvailable()` is `false` nothing is injected and every route answers
 *   403, so no request is made: reads resolve to `defaultValue`, writes reject.
 *
 * @internal
 */
export declare class UserStorageClient implements IUserStorageClient {
  private cache;
  private readonly api;
  private readonly available;
  /** Emits the key of every successful `set`/`remove`, so `get$` re-emits for it. */
  private readonly writes$;
  private readonly httpErrors$;
  /** Emits whenever the cache is hydrated by a lazy fetch. */
  private readonly loaded$;
  /** The current lazy fetch per key: concurrent callers share it, and a fetch missing from it is stale. */
  private readonly fetchesInFlight;
  constructor({ api, initialValues, available, done$ }: UserStorageClientParams);
  isAvailable(): boolean;
  peek<T = unknown>(key: string): T | undefined;
  peek<T = unknown>(key: string, defaultValue: T): T;
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultValue: T): Promise<T>;
  get$<T = unknown>(key: string): Observable<T | undefined>;
  get$<T = unknown>(key: string, defaultValue: T): Observable<T>;
  set<T = unknown>(key: string, value: T): Promise<T>;
  remove(key: string): Promise<void>;
  getHttpError$(): Observable<Error>;
  /** Fails a write with an actionable message instead of a 403. Not an http error - no request was made. */
  private assertAvailable;
  /**
   * Starts or joins the lazy GET for `key`, resolving from the cache when already
   * hydrated. Rejects on HTTP failure, after publishing to `getHttpError$` and
   * clearing the in-flight entry so the next call retries.
   *
   * A `set`/`remove` landing mid-flight makes both outcomes stale: `set` leaves an
   * authoritative value, `remove` leaves the cache absent so a fresh GET runs.
   */
  private startFetch;
  private triggerLazyFetch;
}
