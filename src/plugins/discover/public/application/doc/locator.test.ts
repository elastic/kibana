/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DiscoverSingleDocLocatorDefinition } from './locator';

const dataViewId: string = 'c367b774-a4c2-11ea-bb37-0242ac130002';

const setup = () => {
  const locator = new DiscoverSingleDocLocatorDefinition();
  return { locator };
};

const stateParams = {
  dataViewId,
  columns: ['mock-column'],
  filters: [
    {
      meta: {
        disabled: false,
        negate: false,
        type: 'phrase',
        key: 'mock-key',
        value: 'mock-value',
        params: { query: 'mock-value' },
        index: dataViewId,
      },
      query: { match_phrase: { 'mock-key': 'mock-value' } },
    },
  ],
  savedSearchId: 'mock-saved-search-id',
  timeRange: { from: 'now-15m', to: 'now' },
  query: { query: 'mock-query', language: 'kuery' },
};

describe('Discover single doc url generator', () => {
  test('should create init single doc page', async () => {
    const { locator } = setup();
    const { app, path, state } = await locator.getLocation({
      rowId: 'mock-row-id',
      rowIndex: 'mock-row-index',
      ...stateParams,
      referrer: 'mock-referrer',
    });

    expect(app).toBe('discover');
    expect(state).toEqual({ referrer: 'mock-referrer' });
    expect(path).toMatchInlineSnapshot(
      `"#/doc/c367b774-a4c2-11ea-bb37-0242ac130002/mock-row-index?id=mock-row-id"`
    );
  });
});
