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

import type {
  IUserStorageClient,
  UserStorageUpdate,
  UserStorageValue,
} from '@kbn/core-user-storage-browser';
import type { UserStorageApi } from './user_storage_api';

export interface UserStorageClientParams {
  api: UserStorageApi;
  initialValues: Record<string, unknown>;
  /** Whether user storage is available for the current user (see `IUserStorageClient.isAvailable`). */
  available: boolean;
  done$: Observable<unknown>;
}

/**
 * Browser-side {@link IUserStorageClient}: a synchronous in-memory cache
 * seeded from preloaded (server-injected) metadata (for keys with `preload: true`),
 * with HTTP-backed writes and per-key lazy fetching for non-injected keys.
 *
 * Lazy fetch behaviour:
 * - The first `peek`-miss via `get(key)` / `get$(key)` / `getState$(key)` for a
 *   key absent from the cache triggers a `GET /internal/user_storage/{key}`
 *   request. Once the response arrives, the cache is populated and `get$` /
 *   `getState$` subscribers for that key receive the resolved value. Concurrent
 *   callers for the same uncached key share a single in-flight request.
 * - A successful fetch is sticky even if it resolves to `undefined` (e.g. a key
 *   with no registered default): the key is considered hydrated (via property
 *   presence, not a `!== undefined` check) and is not re-fetched on later calls.
 * - Fetch failures are published to `getHttpError$` but do not cause `get$`
 *   to error or complete; `get()` rejects and `getState$` emits `{status:'error'}`.
 *   The cache entry remains absent, so the next call retries the fetch.
 * - `getUpdate$()` does **not** emit for lazy-fetch hydrations; only explicit
 *   `set` / `remove` calls produce update events.
 *
 * @internal
 */
export class UserStorageClient implements IUserStorageClient {
  private cache: Record<string, unknown>;
  private readonly api: UserStorageApi;
  private readonly available: boolean;
  private readonly update$ = new Subject<UserStorageUpdate>();
  private readonly httpErrors$ = new Subject<Error>();
  /** Emits whenever the cache is hydrated by a lazy fetch. */
  private readonly loaded$ = new Subject<{ key: string; value: unknown }>();
  /** In-flight lazy-fetch promises, keyed by storage key, so concurrent callers share one request. */
  private readonly fetchesInFlight = new Map<string, Promise<unknown>>();

  constructor({ api, initialValues, available, done$ }: UserStorageClientParams) {
    this.api = api;
    this.cache = cloneDeep(initialValues);
    this.available = available;

    done$.subscribe({
      complete: () => {
        this.update$.complete();
        this.httpErrors$.complete();
        this.loaded$.complete();
      },
    });
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public isAvailable$(): Observable<boolean> {
    return of(this.available);
  }

  public canWrite(): boolean {
    return this.isAvailable();
  }

  public canWrite$(): Observable<boolean> {
    return this.isAvailable$();
  }

  public peek<T = unknown>(key: string): T | undefined;
  public peek<T = unknown>(key: string, defaultValue: T): T;
  public peek<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const cached = this.cache[key];
    return cached !== undefined ? (cached as T) : defaultValue;
  }

  public get<T = unknown>(key: string): Promise<T | undefined>;
  public get<T = unknown>(key: string, defaultValue: T): Promise<T>;
  public async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    // `isCached` (not a plain `!== undefined` check) gates the fetch so a
    // successful hydration that resolves to `undefined` is sticky — it will
    // not be re-fetched on every subsequent call.
    const value = this.isCached(key) ? this.cache[key] : await this.startFetch(key);
    return value !== undefined ? (value as T) : defaultValue;
  }

  public get$<T = unknown>(key: string): Observable<T | undefined>;
  public get$<T = unknown>(key: string, defaultValue: T): Observable<T>;
  public get$<T = unknown>(key: string, defaultValue?: T): Observable<T | undefined> {
    const getCurrent = () =>
      defaultValue !== undefined ? this.peek<T>(key, defaultValue) : this.peek<T>(key);

    return concat(
      // Synchronous cache snapshot; also kicks off the lazy fetch (if any) so
      // that the merged `loaded$` source below eventually re-emits.
      defer(() => {
        this.triggerLazyFetch(key);
        return of(getCurrent());
      }),
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
            map(() => getCurrent())
          )
          .subscribe(subscriber);

        return () => {
          writeSub.unsubscribe();
          loadSub.unsubscribe();
        };
      })
    ).pipe(share());
  }

  public getState$<T = unknown>(key: string): Observable<UserStorageValue<T | undefined>>;
  public getState$<T = unknown>(key: string, defaultValue: T): Observable<UserStorageValue<T>>;
  public getState$<T = unknown>(
    key: string,
    defaultValue?: T
  ): Observable<UserStorageValue<T | undefined>> {
    return new Observable<UserStorageValue<T | undefined>>((subscriber) => {
      const emitResolved = () => {
        const cached = this.cache[key];
        const resolved = cached !== undefined ? (cached as T) : defaultValue;
        subscriber.next({ status: 'resolved', value: resolved });
      };

      if (this.isCached(key)) {
        emitResolved();
      } else {
        subscriber.next({ status: 'loading', value: defaultValue });
        this.startFetch(key).then(
          () => {
            if (subscriber.closed) return;
            emitResolved();
          },
          (error: Error) => {
            if (subscriber.closed) return;
            subscriber.next({ status: 'error', value: defaultValue, error });
          }
        );
      }

      // Re-emit the resolved value on every subsequent explicit write.
      const writeSub = this.update$
        .pipe(filter((u) => u.key === key))
        .subscribe(() => emitResolved());

      return () => writeSub.unsubscribe();
    }).pipe(share());
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

  public async update<T = unknown>(
    key: string,
    defaultValue: T,
    updater: (current: T) => T
  ): Promise<T> {
    // Resolved read: never build the mutation on an unhydrated cache/default.
    const current = await this.get<T>(key, defaultValue);
    const next = updater(current);

    // Updater opted out of the mutation (e.g. duplicate/limit-reached) by
    // returning the same reference it was given — skip the write entirely.
    if (next === current) return current;

    return this.set<T>(key, next);
  }

  public getUpdate$(): Observable<UserStorageUpdate> {
    return this.update$.asObservable();
  }

  public getHttpError$(): Observable<Error> {
    return this.httpErrors$.asObservable();
  }

  /**
   * Starts (or joins an already-started) lazy GET for `key`, resolving with
   * the fetched value. Resolves immediately from the cache if already hydrated.
   * Rejects if the underlying HTTP request fails; the failure is also published
   * to `getHttpError$` before rejecting, and the key is removed from the
   * in-flight map so the next call retries.
   */
  private startFetch(key: string): Promise<unknown> {
    if (this.isCached(key)) return Promise.resolve(this.cache[key]);

    const inFlight = this.fetchesInFlight.get(key);
    if (inFlight) return inFlight;

    const promise = this.api.get(key).then(
      (value) => {
        this.cache[key] = value;
        this.fetchesInFlight.delete(key);
        this.loaded$.next({ key, value });
        return value;
      },
      (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.fetchesInFlight.delete(key);
        this.httpErrors$.next(err);
        throw err;
      }
    );

    this.fetchesInFlight.set(key, promise);
    return promise;
  }

  /** Fire-and-forget entry point for callers that can't await the fetch (e.g. `get$`). */
  private triggerLazyFetch(key: string): void {
    // Failures are already published via `getHttpError$` inside `startFetch`;
    // swallow the rejection here so it doesn't surface as an unhandled
    // promise rejection.
    void this.startFetch(key).catch(() => {});
  }

  /**
   * Whether `key` has a hydrated cache entry — a preloaded value, or a lazy
   * fetch that has already completed successfully. Uses property presence
   * (not a `!== undefined` check) so a fetch that resolves to `undefined`
   * (e.g. a key with no registered default) is still sticky and does not
   * trigger a repeat fetch on every subsequent call.
   */
  private isCached(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.cache, key);
  }
}
