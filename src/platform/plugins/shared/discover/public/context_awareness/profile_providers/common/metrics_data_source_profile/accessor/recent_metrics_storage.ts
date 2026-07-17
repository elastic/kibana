/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { BehaviorSubject, type Observable } from 'rxjs';

const RECENT_METRICS_STORAGE_KEY = 'discover:metricsExperience:recentlyExplored';
const RECENT_METRICS_MAX_LENGTH = 100;

const buildStorageKey = (basePath: string): string =>
  `${RECENT_METRICS_STORAGE_KEY}-${new Sha256().update(basePath, 'utf8').digest('base64')}`;

const loadKeys = (storage: IStorageWrapper, storageKey: string): string[] => {
  const stored: unknown = storage.get(storageKey);
  return Array.isArray(stored)
    ? stored.filter((key): key is string => typeof key === 'string')
    : [];
};

export class RecentMetricsStorage {
  private readonly storageKey: string;
  private readonly keys$: BehaviorSubject<readonly string[]>;

  constructor(basePath: string, private readonly storage: IStorageWrapper) {
    this.storageKey = buildStorageKey(basePath);
    this.keys$ = new BehaviorSubject<readonly string[]>(loadKeys(storage, this.storageKey));
  }

  public get(): readonly string[] {
    return this.keys$.getValue();
  }

  public get$(): Observable<readonly string[]> {
    return this.keys$.asObservable();
  }

  public add(metricKey: string): void {
    const next = [metricKey, ...this.keys$.getValue().filter((key) => key !== metricKey)].slice(
      0,
      RECENT_METRICS_MAX_LENGTH
    );
    this.storage.set(this.storageKey, next);
    this.keys$.next(next);
  }
}
