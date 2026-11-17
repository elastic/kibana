/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to a dashboard replays the cached responses of its panels and controls while the
 * time picker selection, the pinned filters and the project routing are the same.
 */

import type { DashboardApiDataInput } from '@kbn/as-code-dashboard-schema';
import type { PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';
import { createMetricPanel, readMetricValue } from '../../../scout/ui/metric_panel';

const ALL_SOURCES_DASHBOARD = 'Replay cache all sources';
const SINGLE_PANEL_DASHBOARD = 'Replay cache single panel';
const FILTERED_DASHBOARD = 'Replay cache filtered';
const FILTER_FIELD = 'machine.os.raw';

/** Relative on purpose: a return that resolved "now" again would never replay. */
const RELATIVE_TIME_RANGE = { from: 'now-30y', to: 'now', mode: 'relative' } as const;

/** Search requests of every strategy: DSL panels and controls, and ES|QL panels and controls. */
const SEARCH_REQUESTS = { endpoint: '/internal/search/', method: 'POST' } as const;

const esqlMetricPanel: NonNullable<DashboardApiDataInput['panels']>[number] = {
  type: 'vis',
  grid: { x: 24, y: 0, w: 24, h: 10 },
  config: {
    type: 'metric',
    data_source: {
      type: 'esql',
      query:
        'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS docs = COUNT(*)',
    },
    metrics: [{ type: 'primary', column: 'docs' }],
  },
};

const getControls = (dataViewId: string): DashboardApiDataInput['pinned_panels'] => [
  {
    type: 'esql_control',
    width: 'medium',
    grow: false,
    config: {
      control_type: 'VALUES_FROM_QUERY',
      esql_query: `FROM logstash-* | WHERE @timestamp >= ?_tstart | STATS BY ${FILTER_FIELD}`,
      selected_options: [],
      single_select: true,
      title: 'os',
      variable_name: 'os',
      variable_type: 'values',
    },
  },
  {
    type: 'range_slider_control',
    width: 'medium',
    grow: false,
    config: { data_view_id: dataViewId, field_name: 'bytes', title: 'bytes' },
  },
];

spaceTest.describe('Dashboard replay cache', { tag: '@local-stateful-classic' }, () => {
  const dashboardIds: Record<string, string> = {};

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const loadedObjects = await scoutSpace.savedObjects.load(DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE);
    const dataView = loadedObjects.find(
      ({ type, title }) => type === 'index-pattern' && title === 'logstash-*'
    );
    if (!dataView) throw new Error('The logstash-* data view was not loaded');

    dashboardIds[ALL_SOURCES_DASHBOARD] = await apiServices.dashboard.create(
      {
        title: ALL_SOURCES_DASHBOARD,
        time_range: RELATIVE_TIME_RANGE,
        panels: [createMetricPanel('logstash-*'), esqlMetricPanel],
        pinned_panels: getControls(dataView.id),
      },
      scoutSpace.id
    );
    dashboardIds[SINGLE_PANEL_DASHBOARD] = await apiServices.dashboard.create(
      {
        title: SINGLE_PANEL_DASHBOARD,
        time_range: RELATIVE_TIME_RANGE,
        panels: [createMetricPanel('logstash-*')],
      },
      scoutSpace.id
    );
    dashboardIds[FILTERED_DASHBOARD] = await apiServices.dashboard.create(
      {
        title: FILTERED_DASHBOARD,
        time_range: RELATIVE_TIME_RANGE,
        filters: [
          { type: 'condition', condition: { field: FILTER_FIELD, operator: 'is', value: 'ios' } },
        ],
        panels: [createMetricPanel('logstash-*')],
      },
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'replays Lens DSL and ES|QL panels and ES|QL and range slider controls, also after Refresh',
    async ({ page, pageObjects, network }) => {
      const { dashboard } = pageObjects;
      await dashboard.openDashboardWithId(dashboardIds[ALL_SOURCES_DASHBOARD]);

      await spaceTest.step('returns without search requests', async () => {
        await dashboard.navigateToListingFromCurrentDashboard();
        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, () =>
          openFromListing(dashboard, ALL_SOURCES_DASHBOARD)
        );
        expect(requestCount).toBe(0);
      });

      await spaceTest.step('Refresh fetches every panel and control again', async () => {
        await network.trackMatchingRequests(SEARCH_REQUESTS, async (getCount) => {
          await dashboard.refresh();
          await expect.poll(getCount, { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
          await dashboard.waitForRenderComplete();
        });
      });

      await spaceTest.step('returns to the refreshed session without search requests', async () => {
        await dashboard.navigateToListingFromCurrentDashboard();
        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, () =>
          openFromListing(dashboard, ALL_SOURCES_DASHBOARD)
        );
        expect(requestCount).toBe(0);
      });
    }
  );

  spaceTest(
    'replays the session started by a time range change',
    async ({ page, pageObjects, network }) => {
      const { dashboard, datePicker } = pageObjects;
      await dashboard.openDashboardWithId(dashboardIds[SINGLE_PANEL_DASHBOARD]);

      const changedValue = await spaceTest.step('changes the time range', async () => {
        await network.trackMatchingRequests(SEARCH_REQUESTS, async (getCount) => {
          await datePicker.setCommonlyUsedTime('Last_1 year');
          await expect.poll(getCount, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
          await dashboard.waitForRenderComplete();
        });
        return readMetricValue(page);
      });

      await spaceTest.step('returns without search requests', async () => {
        await dashboard.navigateToListingFromCurrentDashboard();
        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
          await openFromListing(dashboard, SINGLE_PANEL_DASHBOARD);
          expect(await readMetricValue(page)).toBe(changedValue);
        });
        expect(requestCount).toBe(0);
      });
    }
  );

  spaceTest(
    'fetches once after a filter is pinned, then replays',
    async ({ page, pageObjects, network }) => {
      const { dashboard, filterBar } = pageObjects;
      await dashboard.openDashboardWithId(dashboardIds[FILTERED_DASHBOARD]);

      await spaceTest.step('pinning the filter does not fetch', async () => {
        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
          await filterBar.toggleFilterPinned(FILTER_FIELD);
          await expect
            .poll(() => filterBar.hasFilter({ field: FILTER_FIELD, pinned: true }))
            .toBe(true);
        });
        expect(requestCount).toBe(0);
      });

      await spaceTest.step('the first return fetches with the new pinned filters', async () => {
        await dashboard.navigateToListingFromCurrentDashboard();
        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, () =>
          openFromListing(dashboard, FILTERED_DASHBOARD)
        );
        expect(requestCount).toBeGreaterThanOrEqual(1);
      });

      await spaceTest.step('the next return replays', async () => {
        await dashboard.navigateToListingFromCurrentDashboard();
        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, () =>
          openFromListing(dashboard, FILTERED_DASHBOARD)
        );
        expect(requestCount).toBe(0);
      });
    }
  );
});

/** Opens a dashboard from the listing without reloading the page, which would empty the cache. */
const openFromListing = async (dashboard: PageObjects['dashboard'], title: string) => {
  await dashboard.getDashboardListingLink(title).click();
  await dashboard.waitForRenderComplete();
};
