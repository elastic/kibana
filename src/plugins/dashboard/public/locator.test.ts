/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardAppLocatorDefinition } from './locator';
import { hashedItemStore } from '../../kibana_utils/public';
import { mockStorage } from '../../kibana_utils/public/storage/hashed_item_store/mock';
import { esFilters } from '../../data/public';

describe('dashboard locator', () => {
  beforeEach(() => {
    // @ts-ignore
    hashedItemStore.storage = mockStorage;
  });

  test('creates a link to a saved dashboard', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({});

    expect(location).toMatchObject({
      app: 'dashboards',
      path: '#/create?_a=()&_g=()',
      state: {},
    });
  });

  test('creates a link with global time range set up', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      path: '#/create?_a=()&_g=(time:(from:now-15m,mode:relative,to:now))',
      state: {},
    });
  });

  test('creates a link with filters, time range, refresh interval and query to a saved object', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
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

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/view/123?_a=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),query:(language:kuery,query:bye))&_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))`,
      state: {},
    });
  });

  test('searchSessionId', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      refreshInterval: { pause: false, value: 300 },
      dashboardId: '123',
      filters: [],
      query: { query: 'bye', language: 'kuery' },
      searchSessionId: '__sessionSearchId__',
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/view/123?_a=(filters:!(),query:(language:kuery,query:bye))&_g=(filters:!(),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&searchSessionId=__sessionSearchId__`,
      state: {},
    });
  });

  test('savedQuery', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      savedQuery: '__savedQueryId__',
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/create?_a=(savedQuery:__savedQueryId__)&_g=()`,
      state: {},
    });
    expect(location.path).toContain('__savedQueryId__');
  });

  test('panels', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      panels: [{ fakePanelContent: 'fakePanelContent' }] as any,
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/create?_a=(panels:!((fakePanelContent:fakePanelContent)))&_g=()`,
      state: {},
    });
  });

  test('if no useHash setting is given, uses the one was start services', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: true,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });

    expect(location.path.indexOf('relative')).toBe(-1);
  });

  test('can override a false useHash ui setting', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      useHash: true,
    });

    expect(location.path.indexOf('relative')).toBe(-1);
  });

  test('can override a true useHash ui setting', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: true,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await definition.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      useHash: false,
    });

    expect(location.path.indexOf('relative')).toBeGreaterThan(1);
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
      const definition = new DashboardAppLocatorDefinition({
        useHashedUrl: false,
        getDashboardFilterFields: async (dashboardId: string) => {
          return dashboardId === 'dashboard1'
            ? [savedFilter1]
            : dashboardId === 'dashboard2'
            ? [savedFilter2]
            : [];
        },
      });

      const location1 = await definition.getLocation({
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
      });

      expect(location1.path).toEqual(expect.stringContaining('query:savedfilter1'));
      expect(location1.path).toEqual(expect.stringContaining('query:appliedfilter'));

      const location2 = await definition.getLocation({
        dashboardId: 'dashboard2',
        filters: [appliedFilter],
      });

      expect(location2.path).toEqual(expect.stringContaining('query:savedfilter2'));
      expect(location2.path).toEqual(expect.stringContaining('query:appliedfilter'));
    });

    test("doesn't fail if can't retrieve filters from destination dashboard", async () => {
      const definition = new DashboardAppLocatorDefinition({
        useHashedUrl: false,
        getDashboardFilterFields: async (dashboardId: string) => {
          if (dashboardId === 'dashboard1') {
            throw new Error('Not found');
          }
          return [];
        },
      });

      const location = await definition.getLocation({
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
      });

      expect(location.path).not.toEqual(expect.stringContaining('query:savedfilter1'));
      expect(location.path).toEqual(expect.stringContaining('query:appliedfilter'));
    });

    test('can enforce empty filters', async () => {
      const definition = new DashboardAppLocatorDefinition({
        useHashedUrl: false,
        getDashboardFilterFields: async (dashboardId: string) => {
          if (dashboardId === 'dashboard1') {
            return [savedFilter1];
          }
          return [];
        },
      });

      const location = await definition.getLocation({
        dashboardId: 'dashboard1',
        filters: [],
        preserveSavedFilters: false,
      });

      expect(location.path).not.toEqual(expect.stringContaining('query:savedfilter1'));
      expect(location.path).not.toEqual(expect.stringContaining('query:appliedfilter'));
      expect(location.path).toMatchInlineSnapshot(
        `"#/view/dashboard1?_a=(filters:!())&_g=(filters:!())"`
      );
    });

    test('no filters in result url if no filters applied', async () => {
      const definition = new DashboardAppLocatorDefinition({
        useHashedUrl: false,
        getDashboardFilterFields: async (dashboardId: string) => {
          if (dashboardId === 'dashboard1') {
            return [savedFilter1];
          }
          return [];
        },
      });

      const location = await definition.getLocation({
        dashboardId: 'dashboard1',
      });

      expect(location.path).not.toEqual(expect.stringContaining('filters'));
      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_a=()&_g=()"`);
    });

    test('can turn off preserving filters', async () => {
      const definition = new DashboardAppLocatorDefinition({
        useHashedUrl: false,
        getDashboardFilterFields: async (dashboardId: string) => {
          if (dashboardId === 'dashboard1') {
            return [savedFilter1];
          }
          return [];
        },
      });

      const location = await definition.getLocation({
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
        preserveSavedFilters: false,
      });

      expect(location.path).not.toEqual(expect.stringContaining('query:savedfilter1'));
      expect(location.path).toEqual(expect.stringContaining('query:appliedfilter'));
    });
  });
});
