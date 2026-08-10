/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

const RECENT_METRICS_STORAGE_KEY = 'discover:metricsExperience:recentlyExplored';
const RECENT_METRICS_MAX_LENGTH = 100;

const buildStorageKey = (basePath: string): string =>
  `${RECENT_METRICS_STORAGE_KEY}-${btoa(basePath)}`;

const loadKeys = (storage: IStorageWrapper, storageKey: string): string[] => {
  const stored: unknown = storage.get(storageKey);
  return Array.isArray(stored)
    ? stored.filter((key): key is string => typeof key === 'string')
    : [];
};

export class RecentMetricsStorage {
  private readonly storageKey: string;

  constructor(basePath: string, private readonly storage: IStorageWrapper) {
    this.storageKey = buildStorageKey(basePath);
  }

  public get(): readonly string[] {
    return loadKeys(this.storage, this.storageKey);
  }

  public add(metricKey: string): void {
    const current = loadKeys(this.storage, this.storageKey);
    const next = [metricKey, ...current.filter((key) => key !== metricKey)].slice(
      0,
      RECENT_METRICS_MAX_LENGTH
    );
    this.storage.set(this.storageKey, next);
  }
}
