/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hashedItemStore } from '@kbn/kibana-utils-plugin/public';
import { mockStorage } from '@kbn/kibana-utils-plugin/public/storage/hashed_item_store/mock';
import { FilterStateStore } from '@kbn/es-query';
import { getLocation } from './get_location';

describe('dashboard locator', () => {
  const mockGetDashboardFilters = jest.fn();
  beforeEach(() => {
    // @ts-ignore
    hashedItemStore.storage = mockStorage;
    mockGetDashboardFilters.mockReset();
    mockGetDashboardFilters.mockResolvedValue([]);
  });

  const useHashedUrl = false;

  test('creates a link to an unsaved dashboard', async () => {
    const location = await getLocation({}, useHashedUrl, mockGetDashboardFilters);

    expect(location).toMatchObject({
      app: 'dashboards',
      path: '#/create?_g=()',
      state: {},
    });
  });

  test('creates a link with global time range set up', async () => {
    const location = await getLocation(
      {
        time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
      },
      useHashedUrl,
      mockGetDashboardFilters
    );

    expect(location).toMatchObject({
      app: 'dashboards',
      path: '#/create?_g=(time:(from:now-15m,mode:relative,to:now))',
      state: {
        time_range: {
          from: 'now-15m',
          mode: 'relative',
          to: 'now',
        },
      },
    });
  });

  test('creates a link with filters, time range, refresh interval and query to a saved object', async () => {
    const location = await getLocation(
      {
        time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
        refresh_interval: { pause: false, value: 300 },
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
              store: FilterStateStore.GLOBAL_STATE,
            },
          },
        ],
        query: { query: 'bye', language: 'kql' },
      },
      useHashedUrl,
      mockGetDashboardFilters
    );

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/view/123?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))`,
      state: {
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'hi',
            },
          },
          {
            $state: {
              store: 'globalState',
            },
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'hi',
            },
          },
        ],
        query: {
          query: 'bye',
          language: 'kql',
        },
        refresh_interval: {
          pause: false,
          value: 300,
        },
        time_range: {
          from: 'now-15m',
          mode: 'relative',
          to: 'now',
        },
      },
    });
  });

  test('searchSessionId', async () => {
    const location = await getLocation(
      {
        time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
        refresh_interval: { pause: false, value: 300 },
        dashboardId: '123',
        filters: [],
        query: { query: 'bye', language: 'kql' },
        searchSessionId: '__sessionSearchId__',
      },
      useHashedUrl,
      mockGetDashboardFilters
    );

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/view/123?_g=(filters:!(),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&searchSessionId=__sessionSearchId__`,
      state: {
        filters: [],
        query: {
          query: 'bye',
          language: 'kql',
        },
        refresh_interval: {
          pause: false,
          value: 300,
        },
        time_range: {
          from: 'now-15m',
          mode: 'relative',
          to: 'now',
        },
      },
    });
  });

  test('panels', async () => {
    const location = await getLocation(
      {
        panels: [{ fakePanelContent: 'fakePanelContent' }] as any,
      },
      useHashedUrl,
      mockGetDashboardFilters
    );

    expect(location).toMatchObject({
      app: 'dashboards',
      path: `#/create?_g=()`,
      state: {
        panels: [{ fakePanelContent: 'fakePanelContent' }],
      },
    });
  });

  test('if no useHash setting is given, uses the one was start services', async () => {
    const location = await getLocation(
      {
        time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
      },
      true,
      mockGetDashboardFilters
    );

    expect(location.path.indexOf('relative')).toBe(-1);
  });

  test('can override a false useHash ui setting', async () => {
    const location = await getLocation(
      {
        time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
        useHash: true,
      },
      useHashedUrl,
      mockGetDashboardFilters
    );

    expect(location.path.indexOf('relative')).toBe(-1);
  });

  test('can override a true useHash ui setting', async () => {
    const location = await getLocation(
      {
        time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
        useHash: false,
      },
      true,
      mockGetDashboardFilters
    );

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
      mockGetDashboardFilters.mockImplementation(async (dashboardId: string) => {
        return dashboardId === 'dashboard1'
          ? [savedFilter1]
          : dashboardId === 'dashboard2'
          ? [savedFilter2]
          : [];
      });
      const location1 = await getLocation(
        {
          dashboardId: 'dashboard1',
          filters: [appliedFilter],
        },
        useHashedUrl,
        mockGetDashboardFilters
      );

      expect(location1.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=(filters:!())"`);
      expect(location1.state).toMatchObject({
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'savedfilter1',
            },
          },
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'appliedfilter',
            },
          },
        ],
      });

      const location2 = await getLocation(
        {
          dashboardId: 'dashboard2',
          filters: [appliedFilter],
        },
        useHashedUrl,
        mockGetDashboardFilters
      );

      expect(location2.path).toMatchInlineSnapshot(`"#/view/dashboard2?_g=(filters:!())"`);
      expect(location2.state).toMatchObject({
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'savedfilter2',
            },
          },
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'appliedfilter',
            },
          },
        ],
      });
    });

    test("doesn't fail if can't retrieve filters from destination dashboard", async () => {
      mockGetDashboardFilters.mockImplementation(async (dashboardId: string) => {
        if (dashboardId === 'dashboard1') {
          throw new Error('Not found');
        }
        return [];
      });

      const location = await getLocation(
        {
          dashboardId: 'dashboard1',
          filters: [appliedFilter],
        },
        useHashedUrl,
        mockGetDashboardFilters
      );

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=(filters:!())"`);
      expect(location.state).toMatchObject({
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'appliedfilter',
            },
          },
        ],
      });
    });

    test('can enforce empty filters', async () => {
      mockGetDashboardFilters.mockImplementation(async (dashboardId: string) => {
        if (dashboardId === 'dashboard1') {
          return [savedFilter1];
        }
        return [];
      });

      const location = await getLocation(
        {
          dashboardId: 'dashboard1',
          filters: [],
          preserveSavedFilters: false,
        },
        useHashedUrl,
        mockGetDashboardFilters
      );

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=(filters:!())"`);
      expect(location.state).toMatchObject({
        filters: [],
      });
    });

    test('no filters in result url if no filters applied', async () => {
      mockGetDashboardFilters.mockImplementation(async (dashboardId: string) => {
        if (dashboardId === 'dashboard1') {
          return [savedFilter1];
        }
        return [];
      });

      const location = await getLocation(
        {
          dashboardId: 'dashboard1',
        },
        useHashedUrl,
        mockGetDashboardFilters
      );

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=()"`);
      expect(location.state).toMatchObject({});
    });

    test('can turn off preserving filters', async () => {
      mockGetDashboardFilters.mockImplementation(async (dashboardId: string) => {
        if (dashboardId === 'dashboard1') {
          return [savedFilter1];
        }
        return [];
      });

      const location = await getLocation(
        {
          dashboardId: 'dashboard1',
          filters: [appliedFilter],
          preserveSavedFilters: false,
        },
        useHashedUrl,
        mockGetDashboardFilters
      );

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=(filters:!())"`);
      expect(location.state).toMatchObject({
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
            },
            query: {
              query: 'appliedfilter',
            },
          },
        ],
      });
    });
  });
});
