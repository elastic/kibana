/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { Subject, concat, defer, of, type Observable } from 'rxjs';
import { filter, map } from 'rxjs';

import type { IUserStorageClient, UserStorageUpdate } from '@kbn/core-user-storage-browser';
import type { UserStorageApi } from './user_storage_api';

export interface UserStorageClientParams {
  api: UserStorageApi;
  initialValues: Record<string, unknown>;
  done$: Observable<unknown>;
}

/**
 * Browser-side {@link IUserStorageClient}: a synchronous in-memory cache
 * seeded from server-injected metadata, with HTTP-backed writes.
 *
 * @internal
 */
export class UserStorageClient implements IUserStorageClient {
  private cache: Record<string, unknown>;
  private readonly api: UserStorageApi;
  private readonly update$ = new Subject<UserStorageUpdate>();
  private readonly updateErrors$ = new Subject<Error>();

  constructor({ api, initialValues, done$ }: UserStorageClientParams) {
    this.api = api;
    this.cache = cloneDeep(initialValues);

    done$.subscribe({
      complete: () => {
        this.update$.complete();
        this.updateErrors$.complete();
      },
    });
  }

  public get<T = unknown>(key: string): T | undefined;
  public get<T = unknown>(key: string, defaultValue: T): T;
  public get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const cached = this.cache[key];
    return cached !== undefined ? (cached as T) : defaultValue;
  }

  public get$<T = unknown>(key: string): Observable<T | undefined>;
  public get$<T = unknown>(key: string, defaultValue: T): Observable<T>;
  public get$<T = unknown>(key: string, defaultValue?: T): Observable<T | undefined> {
    const getCurrent = () =>
      defaultValue !== undefined ? this.get<T>(key, defaultValue) : this.get<T>(key);
    return concat(
      defer(() => of(getCurrent())),
      this.update$.pipe(
        filter((u) => u.key === key),
        map(() => getCurrent())
      )
    );
  }

  public getAll(): Readonly<Record<string, unknown>> {
    return cloneDeep(this.cache);
  }

  public async set<T = unknown>(key: string, value: T): Promise<void> {
    try {
      await this.api.set(key, value);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateErrors$.next(err);
      throw err;
    }

    const oldValue = this.cache[key];
    this.cache[key] = value;
    this.update$.next({ key, newValue: value, oldValue });
  }

  public async remove(key: string): Promise<void> {
    try {
      await this.api.remove(key);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateErrors$.next(err);
      throw err;
    }

    const oldValue = this.cache[key];
    delete this.cache[key];
    this.update$.next({ key, newValue: undefined, oldValue });
  }

  public getUpdate$(): Observable<UserStorageUpdate> {
    return this.update$.asObservable();
  }

  public getUpdateErrors$(): Observable<Error> {
    return this.updateErrors$.asObservable();
  }
}
