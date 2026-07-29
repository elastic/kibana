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
import { filter, map } from 'rxjs';

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
 * - The first cache miss via `get(key)` / `get$(key)` / `getState$(key)` for a
 *   key absent from the cache triggers a `GET /internal/user_storage/{key}`
 *   request. Once the response arrives, the cache is populated and `get$` /
 *   `getState$` subscribers for that key receive the resolved value. Concurrent
 *   callers for the same uncached key share a single in-flight request.
 * - "Absent from the cache" is a plain `cache[key] === undefined` check. This is
 *   sound because the server contract guarantees a resolved value is never
 *   `undefined` (registration rejects schemas that accept `undefined`/`null` and
 *   requires a schema-valid `defaultValue` — see the server-internal
 *   `UserStorageService.register`), so a hydrated entry is always non-`undefined`
 *   and `undefined` unambiguously means "not yet fetched".
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
  /** Per-key successful-write counter; a fetch that started before a write is discarded so it can't clobber it. */
  private readonly writeCountByKey = new Map<string, number>();

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

  public peek<T = unknown>(key: string): T | undefined;
  public peek<T = unknown>(key: string, defaultValue: T): T;
  public peek<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const cached = this.cache[key];
    return cached !== undefined ? (cached as T) : defaultValue;
  }

  public get<T = unknown>(key: string): Promise<T | undefined>;
  public get<T = unknown>(key: string, defaultValue: T): Promise<T>;
  public async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    // A cached value is always non-`undefined` - undefined indicates "not yet fetched"
    if (this.cache[key] === undefined) {
      await this.startFetch(key);
    }
    // Re-read after hydration: a set()/remove() may have completed during the fetch.
    const value = this.cache[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  public get$<T = unknown>(key: string): Observable<T | undefined>;
  public get$<T = unknown>(key: string, defaultValue: T): Observable<T>;
  public get$<T = unknown>(key: string, defaultValue?: T): Observable<T | undefined> {
    const getCurrent = () =>
      defaultValue !== undefined ? this.peek<T>(key, defaultValue) : this.peek<T>(key);

    return concat(
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
    );
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

      if (this.cache[key] !== undefined) {
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
    });
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
    this.bumpWriteCount(key);
    // Invalidate any in-flight GET so its stale outcome can't clobber this write.
    this.fetchesInFlight.delete(key);
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
    this.bumpWriteCount(key);
    // Invalidate any in-flight GET so a stale outcome can't resurrect the value.
    this.fetchesInFlight.delete(key);
    this.update$.next({ type: 'remove', key, oldValue });
  }

  public async update<T = unknown>(
    key: string,
    defaultValue: T,
    updater: (current: T) => T
  ): Promise<T> {
    // Ensure hydration is complete before calling the updater
    const current = await this.get<T>(key, defaultValue);
    const next = updater(current);

    if (next === current) return current;

    return this.set<T>(key, next);
  }

  public getUpdate$(): Observable<UserStorageUpdate> {
    return this.update$.asObservable();
  }

  public getHttpError$(): Observable<Error> {
    return this.httpErrors$.asObservable();
  }

  private getWriteCount(key: string): number {
    return this.writeCountByKey.get(key) ?? 0;
  }

  private bumpWriteCount(key: string): void {
    this.writeCountByKey.set(key, this.getWriteCount(key) + 1);
  }

  /**
   * Starts (or joins an already-started) lazy GET for `key`, resolving with
   * the fetched value. Resolves immediately from the cache if already hydrated.
   * Rejects if the underlying HTTP request fails; the failure is also published
   * to `getHttpError$` before rejecting, and the key is removed from the
   * in-flight map so the next call retries.
   *
   * If a successful `set`/`remove` completes while the GET is in flight, both a
   * fetched value and a fetch error are stale and discarded: a `set` leaves an
   * authoritative cache value, a `remove` triggers a post-remove GET for the
   * registered default.
   */
  private startFetch(key: string): Promise<unknown> {
    const cached = this.cache[key];
    if (cached !== undefined) return Promise.resolve(cached);

    const inFlight = this.fetchesInFlight.get(key);
    if (inFlight) return inFlight;

    // Snapshot the write count; a successful set()/remove() landing mid-fetch bumps it.
    const writeCountAtStart = this.getWriteCount(key);

    const getCurrentOrRefetch = () => {
      const current = this.cache[key];
      // A set leaves an authoritative value; a remove leaves the cache absent, so
      // fetch the registered default from the post-remove state.
      return current !== undefined ? current : this.startFetch(key);
    };

    const promise = this.api.get(key).then(
      (value) => {
        // Check staleness before touching the map: a write may have invalidated
        // this promise and installed a newer fetch in its place.
        if (this.getWriteCount(key) !== writeCountAtStart) {
          return getCurrentOrRefetch();
        }
        this.fetchesInFlight.delete(key);
        this.cache[key] = value;
        this.loaded$.next({ key, value });
        return value;
      },
      (error: unknown) => {
        // A stale GET error is obsolete too — recover from the post-write state
        // instead of publishing it.
        if (this.getWriteCount(key) !== writeCountAtStart) {
          return getCurrentOrRefetch();
        }
        const err = error instanceof Error ? error : new Error(String(error));
        this.fetchesInFlight.delete(key);
        this.httpErrors$.next(err);
        throw err;
      }
    );

    this.fetchesInFlight.set(key, promise);
    return promise;
  }

  private triggerLazyFetch(key: string): void {
    void this.startFetch(key).catch(() => {
      // empty catch: errors are already published to `getHttpError$`
    });
  }
}
