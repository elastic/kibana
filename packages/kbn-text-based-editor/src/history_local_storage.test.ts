/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { addQueriesToCache, getCachedQueries, updateCachedQueries } from './history_local_storage';

describe('history local storage', function () {
  const mockGetItem = jest.fn();
  const mockSetItem = jest.fn();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (...args: string[]) => mockGetItem(...args),
      setItem: (...args: string[]) => mockSetItem(...args),
    },
  });
  it('should add queries to cache correctly ', function () {
    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights | limit 10',
      timeZone: 'Browser',
    });
    const historyItems = getCachedQueries();
    expect(historyItems.length).toBe(1);
    expect(historyItems[0].queryRunning).toBe(true);
    expect(historyItems[0].timeRan).toBeDefined();
    expect(historyItems[0].duration).toBeUndefined();
    expect(historyItems[0].status).toBeUndefined();
  });

  it('should update queries to cache correctly ', function () {
    addQueriesToCache({
      queryString: 'from kibana_sample_data_flights \n | limit 10 \n | stats meow = avg(woof)',
      timeZone: 'Browser',
    });
    updateCachedQueries({
      queryString: 'from kibana_sample_data_flights \n | limit 10 \n | stats meow = avg(woof)',
      status: 'success',
    });

    const historyItems = getCachedQueries();
    expect(historyItems.length).toBe(2);
    expect(historyItems[1].queryRunning).toBe(false);
    expect(historyItems[1].timeRan).toBeDefined();
    expect(historyItems[1].duration).toBeDefined();
    expect(historyItems[1].status).toBe('success');

    expect(mockSetItem).toHaveBeenCalledWith(
      'QUERY_HISTORY_ITEM_KEY',
      JSON.stringify(historyItems)
    );
  });

  it('should allow maximum x queries ', function () {
    addQueriesToCache({
      queryString: 'row 1',
      timeZone: 'Browser',
    });
    // allow maximum 2 queries
    updateCachedQueries(
      {
        queryString: 'row 1',
        status: 'success',
      },
      2
    );

    const historyItems = getCachedQueries();
    expect(historyItems.length).toBe(2);
  });
});
