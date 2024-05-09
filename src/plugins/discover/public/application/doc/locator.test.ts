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

describe('Discover single doc url generator', () => {
  test('should create init single doc page', async () => {
    const { locator } = setup();
    const { app, path, state } = await locator.getLocation({
      index: dataViewId,
      rowId: 'mock-row-id',
      rowIndex: 'mock-row-index',
      referrer: 'mock-referrer',
    });

    expect(app).toBe('discover');
    expect(state).toEqual({ referrer: 'mock-referrer' });
    expect(path).toMatchInlineSnapshot(
      `"#/doc/c367b774-a4c2-11ea-bb37-0242ac130002/mock-row-index?id=mock-row-id"`
    );
  });

  it('should URL encode rowId', async () => {
    const { locator } = setup();
    const { path } = await locator.getLocation({
      index: dataViewId,
      rowId: 'id with special characters: &?#+/=',
      rowIndex: 'mock-row-index',
      referrer: 'mock-referrer',
    });
    expect(path).toMatchInlineSnapshot(
      `"#/doc/c367b774-a4c2-11ea-bb37-0242ac130002/mock-row-index?id=id%20with%20special%20characters%3A%20%26%3F%23%2B%2F%3D"`
    );
  });
});
