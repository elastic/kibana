/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { addQueriesToCache, getCachedQueries } from './history_local_storage';

class LocalStorageMock {
  public store: Record<string, unknown>;
  constructor(defaultStore: Record<string, unknown>) {
    this.store = defaultStore;
  }
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: unknown) {
    this.store[key] = String(value);
  }
}

describe('history local storage', function () {
  const storage = new LocalStorageMock({}) as unknown as Storage;
  Object.defineProperty(window, 'localStorage', {
    value: storage,
  });

  beforeEach(() => {
    storage.clear();
  });

  it('should add queries to cache correctly ', function () {
    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights | limit 10',
      status: 'success',
    });
    const historyItems = getCachedQueries();
    expect(historyItems.length).toBe(1);
    expect(historyItems[0].timeRan).toBeDefined();
    expect(historyItems[0].status).toBeDefined();
  });

  it('should add a second query to cache correctly ', function () {
    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights | limit 10',
      status: 'success',
    });

    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights \n | limit 10 \n | stats meow = avg(woof)',
      status: 'error',
    });

    const historyItems = getCachedQueries();
    expect(historyItems.length).toBe(2);
    const errorQuery = historyItems.find((item) =>
      item.queryString.includes('stats meow = avg(woof)')
    );
    expect(errorQuery?.timeRan).toBeDefined();
    expect(errorQuery?.status).toBe('error');
  });

  it('should update queries to cache correctly if they are the same with different format', function () {
    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights | limit 10',
      status: 'success',
    });

    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights \n | limit 10 \n | stats meow = avg(woof)',
      status: 'error',
    });

    // Add the same query as the second one but with different formatting
    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights | limit 10 | stats meow = avg(woof)      ',
      status: 'success',
    });

    const historyItems = getCachedQueries();
    expect(historyItems.length).toBe(2); // Should still be 2 since one query was updated
    // The updated query should have the new status
    const updatedQuery = historyItems.find((item) =>
      item.queryString.includes('stats meow = avg(woof)')
    );
    expect(updatedQuery?.status).toBe('success');
  });

  it('should store queries based on storage size rather than fixed count', function () {
    // Add many small queries - they should all fit within the storage limit
    for (let i = 0; i < 100; i++) {
      addQueriesToCache({
        queryString: `row ${i}`,
        status: 'success',
      });
    }

    const historyItems = getCachedQueries();
    // With small queries, we should be able to store many more than the old limit of 50
    expect(historyItems.length).toBeGreaterThan(50);
    expect(historyItems.length).toBe(100); // All small queries should fit
  });

  it('should respect storage limits with large queries', function () {
    // Create a very large query that will hit the storage limit quickly
    const largeQuery =
      'FROM very_long_index_name_that_takes_up_space_and_uses_lots_of_characters '.repeat(100);

    // Add several large queries
    for (let i = 0; i < 50; i++) {
      addQueriesToCache({
        queryString: `${largeQuery} | WHERE field_${i} == "value_${i}" | STATS count_${i} = COUNT(*) BY category_${i}`,
        status: 'success',
      });
    }

    const historyItems = getCachedQueries();
    // With very large queries, we should hit storage limits
    expect(historyItems.length).toBeLessThan(50);
    expect(historyItems.length).toBeGreaterThan(5); // But still store some queries

    // Each stored query should be properly formed
    expect(historyItems[0].queryString).toContain('FROM very_long_index_name');
    expect(historyItems[0].timeRan).toBeDefined();
    expect(historyItems[0].status).toBe('success');
  });
});
