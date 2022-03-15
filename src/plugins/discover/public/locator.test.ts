/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hashedItemStore, getStatesFromKbnUrl } from '../../kibana_utils/public';
import { mockStorage } from '../../kibana_utils/public/storage/hashed_item_store/mock';
import { FilterStateStore } from '../../data/public';
import { DiscoverAppLocatorDefinition } from './locator';
import { SerializableRecord } from '@kbn/utility-types';

const indexPatternId: string = 'c367b774-a4c2-11ea-bb37-0242ac130002';
const savedSearchId: string = '571aaf70-4c88-11e8-b3d7-01146121b73d';

interface SetupParams {
  useHash?: boolean;
}

const setup = async ({ useHash = false }: SetupParams = {}) => {
  const locator = new DiscoverAppLocatorDefinition({
    useHash,
  });

  return {
    locator,
  };
};

beforeEach(() => {
  // @ts-expect-error
  hashedItemStore.storage = mockStorage;
});

describe('Discover url generator', () => {
  test('can create a link to Discover with no state and no saved search', async () => {
    const { locator } = await setup();
    const { app, path } = await locator.getLocation({});
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(app).toBe('discover');
    expect(_a).toEqual({});
    expect(_g).toEqual({});
  });

  test('can create a link to a saved search in Discover', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({ savedSearchId });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(path.startsWith(`#/view/${savedSearchId}`)).toBe(true);
    expect(_a).toEqual({});
    expect(_g).toEqual({});
  });

  test('can specify specific index pattern', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      indexPatternId,
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(_a).toEqual({
      index: indexPatternId,
    });
    expect(_g).toEqual({});
  });

  test('can specify specific time range', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(_a).toEqual({});
    expect(_g).toEqual({
      time: {
        from: 'now-15m',
        mode: 'relative',
        to: 'now',
      },
    });
  });

  test('can specify query', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      query: {
        language: 'kuery',
        query: 'foo',
      },
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(_a).toEqual({
      query: {
        language: 'kuery',
        query: 'foo',
      },
    });
    expect(_g).toEqual({});
  });

  test('can specify local and global filters', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      filters: [
        {
          meta: {
            alias: 'foo',
            disabled: false,
            negate: false,
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
        {
          meta: {
            alias: 'bar',
            disabled: false,
            negate: false,
          },
          $state: {
            store: FilterStateStore.GLOBAL_STATE,
          },
        },
      ],
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(_a).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: 'foo',
            disabled: false,
            negate: false,
          },
        },
      ],
    });
    expect(_g).toEqual({
      filters: [
        {
          $state: {
            store: 'globalState',
          },
          meta: {
            alias: 'bar',
            disabled: false,
            negate: false,
          },
        },
      ],
    });
  });

  test('can set refresh interval', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      refreshInterval: {
        pause: false,
        value: 666,
      },
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(_a).toEqual({});
    expect(_g).toEqual({
      refreshInterval: {
        pause: false,
        value: 666,
      },
    });
  });

  test('can set time range', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      timeRange: {
        from: 'now-3h',
        to: 'now',
      },
    });
    const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);

    expect(_a).toEqual({});
    expect(_g).toEqual({
      time: {
        from: 'now-3h',
        to: 'now',
      },
    });
  });

  test('can specify a search session id', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      searchSessionId: '__test__',
    });

    expect(path).toMatchInlineSnapshot(`"#/?_g=()&_a=()&searchSessionId=__test__"`);
    expect(path).toContain('__test__');
  });

  test('can specify columns, interval, sort and savedQuery', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({
      columns: ['_source'],
      interval: 'auto',
      sort: [['timestamp, asc']] as string[][] & SerializableRecord,
      savedQuery: '__savedQueryId__',
    });

    expect(path).toMatchInlineSnapshot(
      `"#/?_g=()&_a=(columns:!(_source),interval:auto,savedQuery:__savedQueryId__,sort:!(!('timestamp,%20asc')))"`
    );
  });

  describe('useHash property', () => {
    describe('when default useHash is set to false', () => {
      test('when using default, sets index pattern ID in the generated URL', async () => {
        const { locator } = await setup();
        const { path } = await locator.getLocation({
          indexPatternId,
        });

        expect(path.indexOf(indexPatternId) > -1).toBe(true);
      });

      test('when enabling useHash, does not set index pattern ID in the generated URL', async () => {
        const { locator } = await setup();
        const { path } = await locator.getLocation({
          useHash: true,
          indexPatternId,
        });

        expect(path.indexOf(indexPatternId) > -1).toBe(false);
      });
    });

    describe('when default useHash is set to true', () => {
      test('when using default, does not set index pattern ID in the generated URL', async () => {
        const { locator } = await setup({ useHash: true });
        const { path } = await locator.getLocation({
          indexPatternId,
        });

        expect(path.indexOf(indexPatternId) > -1).toBe(false);
      });

      test('when disabling useHash, sets index pattern ID in the generated URL', async () => {
        const { locator } = await setup({ useHash: true });
        const { path } = await locator.getLocation({
          useHash: false,
          indexPatternId,
        });

        expect(path.indexOf(indexPatternId) > -1).toBe(true);
      });
    });
  });
});
