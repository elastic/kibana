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
export class UserStorageClient implements IUserStorageClient {
  private cache: Record<string, unknown>;
  private readonly api: UserStorageApi;
  private readonly available: boolean;
  /** Emits the key of every successful `set`/`remove`, so `get$` re-emits for it. */
  private readonly writes$ = new Subject<string>();
  private readonly httpErrors$ = new Subject<Error>();
  /** Emits whenever the cache is hydrated by a lazy fetch. */
  private readonly loaded$ = new Subject<{ key: string; value: unknown }>();
  /** The current lazy fetch per key: concurrent callers share it, and a fetch missing from it is stale. */
  private readonly fetchesInFlight = new Map<string, Promise<unknown>>();

  constructor({ api, initialValues, available, done$ }: UserStorageClientParams) {
    this.api = api;
    this.cache = cloneDeep(initialValues);
    this.available = available;

    done$.subscribe({
      complete: () => {
        this.writes$.complete();
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
        const writeSub = this.writes$
          .pipe(
            filter((written) => written === key),
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

  public async set<T = unknown>(key: string, value: T): Promise<T> {
    this.assertAvailable('set', key);

    let stored: T;
    try {
      // Cache what ES holds - the server-validated value, not the raw input.
      stored = (await this.api.set(key, value)) as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.httpErrors$.next(err);
      throw err;
    }

    this.cache[key] = stored;
    // Invalidate any in-flight GET so its stale outcome can't clobber this write.
    this.fetchesInFlight.delete(key);
    this.writes$.next(key);
    return stored;
  }

  public async remove(key: string): Promise<void> {
    this.assertAvailable('remove', key);

    try {
      await this.api.remove(key);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.httpErrors$.next(err);
      throw err;
    }

    delete this.cache[key];
    // Invalidate any in-flight GET so a stale outcome can't resurrect the value.
    this.fetchesInFlight.delete(key);
    this.writes$.next(key);
  }

  public getHttpError$(): Observable<Error> {
    return this.httpErrors$.asObservable();
  }

  /** Fails a write with an actionable message instead of a 403. Not an http error - no request was made. */
  private assertAvailable(operation: 'set' | 'remove', key: string): void {
    if (!this.available) {
      throw new Error(
        `Cannot ${operation} user storage key "${key}": user storage is not available for the current user. Gate write affordances on isAvailable().`
      );
    }
  }

  /**
   * Starts or joins the lazy GET for `key`, resolving from the cache when already
   * hydrated. Rejects on HTTP failure, after publishing to `getHttpError$` and
   * clearing the in-flight entry so the next call retries.
   *
   * A `set`/`remove` landing mid-flight makes both outcomes stale: `set` leaves an
   * authoritative value, `remove` leaves the cache absent so a fresh GET runs.
   */
  private startFetch(key: string): Promise<unknown> {
    // Nothing to fetch without user storage; readers fall back to their defaults.
    if (!this.available) return Promise.resolve(undefined);

    const cached = this.cache[key];
    if (cached !== undefined) return Promise.resolve(cached);

    const inFlight = this.fetchesInFlight.get(key);
    if (inFlight) return inFlight;

    const getCurrentOrRefetch = () => {
      const current = this.cache[key];
      // Absent means a remove landed; refetch for the registered default.
      return current !== undefined ? current : this.startFetch(key);
    };

    const isStale = () => this.fetchesInFlight.get(key) !== promise;

    const promise: Promise<unknown> = this.api.get(key).then(
      (value) => {
        // A write (or a newer fetch replacing this one) removed this promise from the map.
        if (isStale()) {
          return getCurrentOrRefetch();
        }
        this.fetchesInFlight.delete(key);
        this.cache[key] = value;
        this.loaded$.next({ key, value });
        return value;
      },
      (error: unknown) => {
        // Recover from the post-write state rather than publishing an obsolete error.
        if (isStale()) {
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
