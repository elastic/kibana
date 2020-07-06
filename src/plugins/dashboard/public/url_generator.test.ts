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

import { createDashboardUrlGenerator } from './url_generator';
import { hashedItemStore } from '../../kibana_utils/public';
// eslint-disable-next-line
import { mockStorage } from '../../kibana_utils/public/storage/hashed_item_store/mock';
import { esFilters, Filter } from '../../data/public';
import { SavedObjectLoader } from '../../saved_objects/public';

const APP_BASE_PATH: string = 'xyz/app/dashboards';

const createMockDashboardLoader = (
  dashboardToFilters: {
    [dashboardId: string]: () => Filter[];
  } = {}
) => {
  return {
    get: async (dashboardId: string) => {
      return {
        searchSource: {
          getField: (field: string) => {
            if (field === 'filter')
              return dashboardToFilters[dashboardId] ? dashboardToFilters[dashboardId]() : [];
            throw new Error(
              `createMockDashboardLoader > searchSource > getField > ${field} is not mocked`
            );
          },
        },
      };
    },
  } as SavedObjectLoader;
};

describe('dashboard url generator', () => {
  beforeEach(() => {
    // @ts-ignore
    hashedItemStore.storage = mockStorage;
  });

  test('creates a link to a saved dashboard', async () => {
    const generator = createDashboardUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
        savedDashboardLoader: createMockDashboardLoader(),
      })
    );
    const url = await generator.createUrl!({});
    expect(url).toMatchInlineSnapshot(`"xyz/app/dashboards#/create?_a=()&_g=()"`);
  });

  test('creates a link with global time range set up', async () => {
    const generator = createDashboardUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
        savedDashboardLoader: createMockDashboardLoader(),
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });
    expect(url).toMatchInlineSnapshot(
      `"xyz/app/dashboards#/create?_a=()&_g=(time:(from:now-15m,mode:relative,to:now))"`
    );
  });

  test('creates a link with filters, time range, refresh interval and query to a saved object', async () => {
    const generator = createDashboardUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
        savedDashboardLoader: createMockDashboardLoader(),
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      refreshInterval: { pause: false, value: 300 },
      dashboardId: '123',
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
        },
      ],
      query: { query: 'bye', language: 'kuery' },
    });
    expect(url).toMatchInlineSnapshot(
      `"xyz/app/dashboards#/view/123?_a=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),query:(language:kuery,query:bye))&_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))"`
    );
  });

  test('if no useHash setting is given, uses the one was start services', async () => {
    const generator = createDashboardUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: true,
        savedDashboardLoader: createMockDashboardLoader(),
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });
    expect(url.indexOf('relative')).toBe(-1);
  });

  test('can override a false useHash ui setting', async () => {
    const generator = createDashboardUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
        savedDashboardLoader: createMockDashboardLoader(),
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      useHash: true,
    });
    expect(url.indexOf('relative')).toBe(-1);
  });

  test('can override a true useHash ui setting', async () => {
    const generator = createDashboardUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: true,
        savedDashboardLoader: createMockDashboardLoader(),
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      useHash: false,
    });
    expect(url.indexOf('relative')).toBeGreaterThan(1);
  });

  describe('preserving saved filters', () => {
    const savedFilter1 = {
      meta: {
        alias: null,
        disabled: false,
        negate: false,
      },
      query: { query: 'savedfilter1' },
    };

    const savedFilter2 = {
      meta: {
        alias: null,
        disabled: false,
        negate: false,
      },
      query: { query: 'savedfilter2' },
    };

    const appliedFilter = {
      meta: {
        alias: null,
        disabled: false,
        negate: false,
      },
      query: { query: 'appliedfilter' },
    };

    test('attaches filters from destination dashboard', async () => {
      const generator = createDashboardUrlGenerator(() =>
        Promise.resolve({
          appBasePath: APP_BASE_PATH,
          useHashedUrl: false,
          savedDashboardLoader: createMockDashboardLoader({
            ['dashboard1']: () => [savedFilter1],
            ['dashboard2']: () => [savedFilter2],
          }),
        })
      );

      const urlToDashboard1 = await generator.createUrl!({
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
      });

      expect(urlToDashboard1).toEqual(expect.stringContaining('query:savedfilter1'));
      expect(urlToDashboard1).toEqual(expect.stringContaining('query:appliedfilter'));

      const urlToDashboard2 = await generator.createUrl!({
        dashboardId: 'dashboard2',
        filters: [appliedFilter],
      });

      expect(urlToDashboard2).toEqual(expect.stringContaining('query:savedfilter2'));
      expect(urlToDashboard2).toEqual(expect.stringContaining('query:appliedfilter'));
    });

    test("doesn't fail if can't retrieve filters from destination dashboard", async () => {
      const generator = createDashboardUrlGenerator(() =>
        Promise.resolve({
          appBasePath: APP_BASE_PATH,
          useHashedUrl: false,
          savedDashboardLoader: createMockDashboardLoader({
            ['dashboard1']: () => {
              throw new Error('Not found');
            },
          }),
        })
      );

      const url = await generator.createUrl!({
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
      });

      expect(url).not.toEqual(expect.stringContaining('query:savedfilter1'));
      expect(url).toEqual(expect.stringContaining('query:appliedfilter'));
    });

    test('can enforce empty filters', async () => {
      const generator = createDashboardUrlGenerator(() =>
        Promise.resolve({
          appBasePath: APP_BASE_PATH,
          useHashedUrl: false,
          savedDashboardLoader: createMockDashboardLoader({
            ['dashboard1']: () => [savedFilter1],
          }),
        })
      );

      const url = await generator.createUrl!({
        dashboardId: 'dashboard1',
        filters: [],
        preserveSavedFilters: false,
      });

      expect(url).not.toEqual(expect.stringContaining('query:savedfilter1'));
      expect(url).not.toEqual(expect.stringContaining('query:appliedfilter'));
      expect(url).toMatchInlineSnapshot(
        `"xyz/app/dashboards#/view/dashboard1?_a=(filters:!())&_g=(filters:!())"`
      );
    });

    test('no filters in result url if no filters applied', async () => {
      const generator = createDashboardUrlGenerator(() =>
        Promise.resolve({
          appBasePath: APP_BASE_PATH,
          useHashedUrl: false,
          savedDashboardLoader: createMockDashboardLoader({
            ['dashboard1']: () => [savedFilter1],
          }),
        })
      );

      const url = await generator.createUrl!({
        dashboardId: 'dashboard1',
      });
      expect(url).not.toEqual(expect.stringContaining('filters'));
      expect(url).toMatchInlineSnapshot(`"xyz/app/dashboards#/view/dashboard1?_a=()&_g=()"`);
    });

    test('can turn off preserving filters', async () => {
      const generator = createDashboardUrlGenerator(() =>
        Promise.resolve({
          appBasePath: APP_BASE_PATH,
          useHashedUrl: false,
          savedDashboardLoader: createMockDashboardLoader({
            ['dashboard1']: () => [savedFilter1],
          }),
        })
      );
      const urlWithPreservedFiltersTurnedOff = await generator.createUrl!({
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
        preserveSavedFilters: false,
      });

      expect(urlWithPreservedFiltersTurnedOff).not.toEqual(
        expect.stringContaining('query:savedfilter1')
      );
      expect(urlWithPreservedFiltersTurnedOff).toEqual(
        expect.stringContaining('query:appliedfilter')
      );
    });
  });
});
