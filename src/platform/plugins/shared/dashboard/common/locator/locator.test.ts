/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardAppLocatorDefinition } from './locator';
import { hashedItemStore } from '@kbn/kibana-utils-plugin/public';
import { mockStorage } from '@kbn/kibana-utils-plugin/public/storage/hashed_item_store/mock';
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { DashboardLocatorParams, DashboardLocatorParamsSerializable } from '../types';

describe('dashboard locator', () => {
  const getLocation = (
    definition: DashboardAppLocatorDefinition,
    params: Partial<DashboardLocatorParams> = {}
  ) => definition.getLocation(params as DashboardLocatorParamsSerializable);

  const makeConditionFilter = (field: string, value: string): AsCodeFilter => ({
    type: 'condition',
    condition: {
      field,
      operator: 'is',
      value,
    },
  });

  beforeEach(() => {
    // @ts-ignore
    hashedItemStore.storage = mockStorage;
  });

  test('creates a link to an unsaved dashboard', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition);

    expect(location).toMatchObject({
      app: 'dashboards',
      state: {},
    });
    expect(location.path).toMatchInlineSnapshot(`"#/create?_g=()"`);
  });

  test('creates a link with global time range set up', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      state: {
        time_range: {
          from: 'now-15m',
          mode: 'relative',
          to: 'now',
        },
      },
    });
    expect(location.path).toMatchInlineSnapshot(
      `"#/create?_g=(time:(from:now-15m,mode:relative,to:now))"`
    );
  });

  test('creates a link with filters, time range, refresh interval and query to a saved object', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
      refresh_interval: { pause: false, value: 300 },
      dashboardId: '123',
      filters: [makeConditionFilter('status', 'hi')],
      pinnedFilters: [makeConditionFilter('status', 'pinned')],
      query: { query: 'bye', language: 'kuery' },
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      state: {
        filters: [makeConditionFilter('status', 'hi')],
        query: {
          language: 'kuery',
          query: 'bye',
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
    expect(location.path).toMatchInlineSnapshot(
      `"#/view/123?_g=(filters:!(('$state':(store:globalState),meta:(field:status,key:status,params:(query:pinned),type:phrase),query:(match_phrase:(status:pinned)))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))"`
    );
  });

  test('searchSessionId', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
      refresh_interval: { pause: false, value: 300 },
      dashboardId: '123',
      filters: [],
      query: { query: 'bye', language: 'kuery' },
      searchSessionId: '__sessionSearchId__',
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      state: {
        filters: [],
        query: {
          language: 'kuery',
          query: 'bye',
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
    expect(location.path).toMatchInlineSnapshot(
      `"#/view/123?_g=(refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&searchSessionId=__sessionSearchId__"`
    );
  });

  test('panels', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      panels: [{ fakePanelContent: 'fakePanelContent' }] as any,
    });

    expect(location).toMatchObject({
      app: 'dashboards',
      state: {
        panels: [{ fakePanelContent: 'fakePanelContent' }],
      },
    });
    expect(location.path).toMatchInlineSnapshot(`"#/create?_g=()"`);
  });

  test('if no useHash setting is given, uses the one was start services', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: true,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
    });

    expect(location.path.indexOf('relative')).toBe(-1);
  });

  test('can override a false useHash ui setting', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
      useHash: true,
    });

    expect(location.path.indexOf('relative')).toBe(-1);
  });

  test('can override a true useHash ui setting', async () => {
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: true,
      getDashboardFilterFields: async (dashboardId: string) => [],
    });
    const location = await getLocation(definition, {
      time_range: { to: 'now', from: 'now-15m', mode: 'relative' },
      useHash: false,
    });

    expect(location.path.indexOf('relative')).toBeGreaterThan(1);
  });

  describe('preserving saved filters', () => {
    const savedFilter1 = makeConditionFilter('status', 'savedfilter1');
    const savedFilter2 = makeConditionFilter('status', 'savedfilter2');
    const appliedFilter = makeConditionFilter('status', 'appliedfilter');

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

      const location1 = await getLocation(definition, {
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
      });

      expect(location1.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=()"`);
      expect(location1.state).toMatchObject({
        filters: [savedFilter1, appliedFilter],
      });

      const location2 = await getLocation(definition, {
        dashboardId: 'dashboard2',
        filters: [appliedFilter],
      });

      expect(location2.path).toMatchInlineSnapshot(`"#/view/dashboard2?_g=()"`);
      expect(location2.state).toMatchObject({
        filters: [savedFilter2, appliedFilter],
      });
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

      const location = await getLocation(definition, {
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
      });

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=()"`);
      expect(location.state).toMatchObject({
        filters: [appliedFilter],
      });
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

      const location = await getLocation(definition, {
        dashboardId: 'dashboard1',
        filters: [],
        preserveSavedFilters: false,
      });

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=()"`);
      expect(location.state).toMatchObject({
        filters: [],
      });
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

      const location = await getLocation(definition, {
        dashboardId: 'dashboard1',
      });

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=()"`);
      expect(location.state).toMatchObject({});
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

      const location = await getLocation(definition, {
        dashboardId: 'dashboard1',
        filters: [appliedFilter],
        preserveSavedFilters: false,
      });

      expect(location.path).toMatchInlineSnapshot(`"#/view/dashboard1?_g=()"`);
      expect(location.state).toMatchObject({
        filters: [appliedFilter],
      });
    });
  });
});
