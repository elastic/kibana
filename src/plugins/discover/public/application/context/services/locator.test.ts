/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStatesFromKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { DiscoverContextAppLocatorDefinition } from './locator';

const dataViewId: string = 'c367b774-a4c2-11ea-bb37-0242ac130002';

interface SetupParams {
  useHash?: boolean;
}

const setup = async ({ useHash = false }: SetupParams = {}) => {
  const locator = new DiscoverContextAppLocatorDefinition({ useHash });
  return { locator };
};

const appStateParams = {
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
};

describe('Discover context url generator', () => {
  test('can create basic link to context', async () => {
    const { locator } = await setup();
    const { app, path } = await locator.getLocation({
      index: dataViewId,
      rowId: 'mock-row-id',
      referrer: 'mock-referrer',
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(app).toBe('discover');
    expect(_a).toEqual({});
    expect(_g).toEqual({});
  });

  test('should fill history state for context view', async () => {
    const { locator } = await setup();

    const { path, state } = await locator.getLocation({
      index: dataViewId,
      rowId: 'mock-row-id',
      ...appStateParams,
      referrer: 'mock-referrer',
    });

    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);
    expect(path).toMatchInlineSnapshot(
      `"#/context/c367b774-a4c2-11ea-bb37-0242ac130002/mock-row-id?_g=(filters:!())&_a=(columns:!(mock-column),filters:!((meta:(disabled:!f,index:c367b774-a4c2-11ea-bb37-0242ac130002,key:mock-key,negate:!f,params:(query:mock-value),type:phrase,value:mock-value),query:(match_phrase:(mock-key:mock-value)))))"`
    );
    expect(state).toEqual({ referrer: 'mock-referrer' });
    expect(_a).toEqual(appStateParams);
    expect(_g).toEqual({ filters: [] });
  });

  test('when useHash set to false, sets data view ID in the generated URL', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      index: dataViewId,
      rowId: 'mock-row-id',
      ...appStateParams,
      referrer: 'mock-referrer',
    });

    expect(path.indexOf(dataViewId) > -1).toBe(true);
    expect(path).toMatchInlineSnapshot(
      `"#/context/c367b774-a4c2-11ea-bb37-0242ac130002/mock-row-id?_g=(filters:!())&_a=(columns:!(mock-column),filters:!((meta:(disabled:!f,index:c367b774-a4c2-11ea-bb37-0242ac130002,key:mock-key,negate:!f,params:(query:mock-value),type:phrase,value:mock-value),query:(match_phrase:(mock-key:mock-value)))))"`
    );
  });

  test('when useHash set to true, does not set data view ID in the generated URL', async () => {
    const { locator } = await setup({ useHash: true });
    const { path } = await locator.getLocation({
      index: dataViewId,
      rowId: 'mock-row-id',
      ...appStateParams,
      referrer: 'mock-referrer',
    });

    expect(path).toMatchInlineSnapshot(
      `"#/context/c367b774-a4c2-11ea-bb37-0242ac130002/mock-row-id?_g=h@3a04046&_a=h@9ad8c77"`
    );
  });
});
