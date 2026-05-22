/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { Observable, Subject, concat, defer, of } from 'rxjs';
import { filter, map, share } from 'rxjs';

import type { IUserStorageClient, UserStorageUpdate } from '@kbn/core-user-storage-browser';
import type { UserStorageApi } from './user_storage_api';

export interface UserStorageClientParams {
  api: UserStorageApi;
  initialValues: Record<string, unknown>;
  done$: Observable<unknown>;
}

/**
 * Browser-side {@link IUserStorageClient}: a synchronous in-memory cache
 * seeded from preloaded (server-injected) metadata (for keys with `preload: true`),
 * with HTTP-backed writes and per-key lazy fetching for non-injected keys.
 *
 * Lazy fetch behaviour:
 * - The first `get(key)` / `get$(key)` call for a key that is absent from
 *   the cache triggers a fire-and-forget `GET /internal/user_storage/{key}`
 *   request. Once the response arrives, the cache is populated and `get$`
 *   subscribers for that key receive the resolved value.
 * - Fetch failures are published to `getHttpError$` but do not cause `get$`
 *   to error or complete. The cache entry remains absent.
 * - `getUpdate$()` does **not** emit for lazy-fetch hydrations; only explicit
 *   `set` / `remove` calls produce update events.
 *
 * @internal
 */
export class UserStorageClient implements IUserStorageClient {
  private cache: Record<string, unknown>;
  private readonly api: UserStorageApi;
  private readonly update$ = new Subject<UserStorageUpdate>();
  private readonly httpErrors$ = new Subject<Error>();
  /** Emits whenever the cache is hydrated by a lazy fetch. */
  private readonly loaded$ = new Subject<{ key: string; value: unknown }>();
  /** Set of keys for which a lazy fetch has already been initiated. */
  private readonly fetchInitiated = new Set<string>();

  constructor({ api, initialValues, done$ }: UserStorageClientParams) {
    this.api = api;
    this.cache = cloneDeep(initialValues);

    done$.subscribe({
      complete: () => {
        this.update$.complete();
        this.httpErrors$.complete();
        this.loaded$.complete();
      },
    });
  }

  public peek<T = unknown>(key: string): T | undefined;
  public peek<T = unknown>(key: string, defaultValue: T): T;
  public peek<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const cached = this.cache[key];
    return cached !== undefined ? (cached as T) : defaultValue;
  }

  public get<T = unknown>(key: string): T | undefined;
  public get<T = unknown>(key: string, defaultValue: T): T;
  public get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const cached = this.cache[key];
    if (cached !== undefined) return cached as T;
    this.triggerLazyFetch(key);
    return defaultValue;
  }

  public get$<T = unknown>(key: string): Observable<T | undefined>;
  public get$<T = unknown>(key: string, defaultValue: T): Observable<T>;
  public get$<T = unknown>(key: string, defaultValue?: T): Observable<T | undefined> {
    const getCurrent = () =>
      defaultValue !== undefined ? this.get<T>(key, defaultValue) : this.get<T>(key);

    // The lazy fetch is triggered inside getCurrent() → get() on first eval.
    return concat(
      defer(() => of(getCurrent())),
      // Merge explicit writes and lazy-fetch hydrations for this key.
      new Observable<T | undefined>((subscriber) => {
        const writeSub = this.update$
          .pipe(
            filter((u) => u.key === key),
            map(() => getCurrent())
          )
          .subscribe(subscriber);

        const loadSub = this.loaded$
          .pipe(
            filter((e) => e.key === key),
            map(() =>
              defaultValue !== undefined ? this.get<T>(key, defaultValue) : this.get<T>(key)
            )
          )
          .subscribe(subscriber);

        return () => {
          writeSub.unsubscribe();
          loadSub.unsubscribe();
        };
      })
    ).pipe(share());
  }

  public async set<T = unknown>(key: string, value: T): Promise<T> {
    let stored: T;
    try {
      // Cache the server-validated value (post-transform/strip) rather than
      // the raw input, so the browser state stays in sync with what ES holds.
      stored = (await this.api.set(key, value)) as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.httpErrors$.next(err);
      throw err;
    }

    const oldValue = this.cache[key];
    this.cache[key] = stored;
    this.update$.next({ type: 'set', key, newValue: stored, oldValue });
    return stored;
  }

  public async remove(key: string): Promise<void> {
    try {
      await this.api.remove(key);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.httpErrors$.next(err);
      throw err;
    }

    const oldValue = this.cache[key];
    delete this.cache[key];
    this.update$.next({ type: 'remove', key, oldValue });
  }

  public getUpdate$(): Observable<UserStorageUpdate> {
    return this.update$.asObservable();
  }

  public getHttpError$(): Observable<Error> {
    return this.httpErrors$.asObservable();
  }

  /**
   * Initiates a single fire-and-forget GET for `key` if it is not yet cached
   * and no prior fetch has been triggered for it in the lifetime of this client.
   */
  private triggerLazyFetch(key: string): void {
    if (this.cache[key] !== undefined || this.fetchInitiated.has(key)) return;
    this.fetchInitiated.add(key);

    this.api.get(key).then(
      (value) => {
        this.cache[key] = value;
        this.loaded$.next({ key, value });
      },
      (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.httpErrors$.next(err);
        // Remove key from the initiated set so callers can retry on
        // re-mount if they want to (same session, same client instance).
        this.fetchInitiated.delete(key);
      }
    );
  }
}
