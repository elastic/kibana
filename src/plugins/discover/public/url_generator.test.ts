/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DiscoverUrlGenerator } from './url_generator';
import { hashedItemStore, getStatesFromKbnUrl } from '../../kibana_utils/public';
// eslint-disable-next-line
import { mockStorage } from '../../kibana_utils/public/storage/hashed_item_store/mock';
import { FilterStateStore } from '../../data/common';

const appBasePath: string = 'xyz/app/discover';
const indexPatternId: string = 'c367b774-a4c2-11ea-bb37-0242ac130002';
const savedSearchId: string = '571aaf70-4c88-11e8-b3d7-01146121b73d';

interface SetupParams {
  useHash?: boolean;
}

const setup = async ({ useHash = false }: SetupParams = {}) => {
  const generator = new DiscoverUrlGenerator({
    appBasePath,
    useHash,
  });

  return {
    generator,
  };
};

beforeEach(() => {
  // @ts-ignore
  hashedItemStore.storage = mockStorage;
});

describe('Discover url generator', () => {
  test('can create a link to Discover with no state and no saved search', async () => {
    const { generator } = await setup();
    const url = await generator.createUrl({});
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

    expect(url.startsWith(appBasePath)).toBe(true);
    expect(_a).toEqual({});
    expect(_g).toEqual({});
  });

  test('can create a link to a saved search in Discover', async () => {
    const { generator } = await setup();
    const url = await generator.createUrl({ savedSearchId });
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

    expect(url.startsWith(`${appBasePath}#/${savedSearchId}`)).toBe(true);
    expect(_a).toEqual({});
    expect(_g).toEqual({});
  });

  test('can specify specific index pattern', async () => {
    const { generator } = await setup();
    const url = await generator.createUrl({
      indexPatternId,
    });
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

    expect(_a).toEqual({
      index: indexPatternId,
    });
    expect(_g).toEqual({});
  });

  test('can specify specific time range', async () => {
    const { generator } = await setup();
    const url = await generator.createUrl({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

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
    const { generator } = await setup();
    const url = await generator.createUrl({
      query: {
        language: 'kuery',
        query: 'foo',
      },
    });
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

    expect(_a).toEqual({
      query: {
        language: 'kuery',
        query: 'foo',
      },
    });
    expect(_g).toEqual({});
  });

  test('can specify local and global filters', async () => {
    const { generator } = await setup();
    const url = await generator.createUrl({
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
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

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
    const { generator } = await setup();
    const url = await generator.createUrl({
      refreshInterval: {
        pause: false,
        value: 666,
      },
    });
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

    expect(_a).toEqual({});
    expect(_g).toEqual({
      refreshInterval: {
        pause: false,
        value: 666,
      },
    });
  });

  test('can set time range', async () => {
    const { generator } = await setup();
    const url = await generator.createUrl({
      timeRange: {
        from: 'now-3h',
        to: 'now',
      },
    });
    const { _a, _g } = getStatesFromKbnUrl(url, ['_a', '_g']);

    expect(_a).toEqual({});
    expect(_g).toEqual({
      time: {
        from: 'now-3h',
        to: 'now',
      },
    });
  });

  describe('useHash property', () => {
    describe('when default useHash is set to false', () => {
      test('when using default, sets index pattern ID in the generated URL', async () => {
        const { generator } = await setup();
        const url = await generator.createUrl({
          indexPatternId,
        });

        expect(url.indexOf(indexPatternId) > -1).toBe(true);
      });

      test('when enabling useHash, does not set index pattern ID in the generated URL', async () => {
        const { generator } = await setup();
        const url = await generator.createUrl({
          useHash: true,
          indexPatternId,
        });

        expect(url.indexOf(indexPatternId) > -1).toBe(false);
      });
    });

    describe('when default useHash is set to true', () => {
      test('when using default, does not set index pattern ID in the generated URL', async () => {
        const { generator } = await setup({ useHash: true });
        const url = await generator.createUrl({
          indexPatternId,
        });

        expect(url.indexOf(indexPatternId) > -1).toBe(false);
      });

      test('when disabling useHash, sets index pattern ID in the generated URL', async () => {
        const { generator } = await setup();
        const url = await generator.createUrl({
          useHash: false,
          indexPatternId,
        });

        expect(url.indexOf(indexPatternId) > -1).toBe(true);
      });
    });
  });
});
