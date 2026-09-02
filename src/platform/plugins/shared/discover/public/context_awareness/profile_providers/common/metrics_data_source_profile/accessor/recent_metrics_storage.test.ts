/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { RecentMetricsStorage } from './recent_metrics_storage';

const createFakeStorage = (): IStorageWrapper => {
  const store = new Map<string, unknown>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => store.set(key, value),
    remove: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

const BASE_PATH = '/s/default';

describe('RecentMetricsStorage', () => {
  it('starts empty and records interactions most-recent-first, deduped and persisted', () => {
    const storage = createFakeStorage();
    const log = new RecentMetricsStorage(BASE_PATH, storage);

    expect(log.get()).toEqual([]);

    log.add('a');
    log.add('b');
    log.add('a');

    expect(log.get()).toEqual(['a', 'b']);
    // A fresh instance loads the persisted list.
    expect(new RecentMetricsStorage(BASE_PATH, storage).get()).toEqual(['a', 'b']);
  });

  it('caps the list at 100 entries', () => {
    const log = new RecentMetricsStorage(BASE_PATH, createFakeStorage());

    for (let i = 0; i < 101; i++) {
      log.add(`metric-${i}`);
    }

    expect(log.get()).toHaveLength(100);
    expect(log.get()[0]).toBe('metric-100');
  });

  it('namespaces the storage per basePath', () => {
    const storage = createFakeStorage();

    new RecentMetricsStorage('/s/one', storage).add('a');
    new RecentMetricsStorage('/s/two', storage).add('b');

    expect(new RecentMetricsStorage('/s/one', storage).get()).toEqual(['a']);
    expect(new RecentMetricsStorage('/s/two', storage).get()).toEqual(['b']);
  });

  it('does not lose entries when two tabs share the same storage', () => {
    const storage = createFakeStorage();
    const tabA = new RecentMetricsStorage(BASE_PATH, storage);
    const tabB = new RecentMetricsStorage(BASE_PATH, storage);

    tabA.add('a');
    expect(tabB.get()).toEqual(['a']);

    tabB.add('b');
    expect(tabA.get()).toEqual(['b', 'a']);
  });
});
