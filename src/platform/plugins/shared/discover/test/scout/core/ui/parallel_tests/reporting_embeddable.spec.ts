/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { VIEW_MODE } from '../../../../../common/constants';
import type { DiscoverSessionTab } from '../../../../../server';
import { spaceTest, testData, type DiscoverScoutSpace } from '../../../common/ui/fixtures';

const ESQL_SESSION_TITLE = 'Reporting ES|QL session';

const createDashboardWithSessionPanel = async (
  apiServices: ApiServicesFixture,
  spaceId: string,
  sessionTitle: string,
  dashboardTitle: string,
  tab: DiscoverSessionTab
): Promise<string> =>
  apiServices.dashboard.create(
    {
      title: dashboardTitle,
      time_range: {
        ...testData.DEFAULT_TIME_RANGE,
        mode: 'absolute',
      },
      panels: [
        {
          type: 'discover_session',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: {
            title: sessionTitle,
            tabs: [tab],
          },
        },
      ],
    },
    spaceId
  );

const getSessionTab = (
  mode: 'classic' | 'ES|QL',
  discoverScoutSpace: DiscoverScoutSpace
): DiscoverSessionTab => {
  if (mode === 'ES|QL') {
    return {
      data_source: {
        type: 'esql',
        query:
          'FROM logstash-* | STATS average_bytes = AVG(bytes) BY extension | SORT average_bytes DESC',
      },
      sort: [],
    };
  }

  return {
    data_source: {
      type: 'data_view_reference',
      ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
    },
    query: { language: 'kql', expression: '' },
    filters: [],
    sort: [{ name: '@timestamp', direction: 'desc' }],
    view_mode: VIEW_MODE.DOCUMENT_LEVEL,
  };
};

spaceTest.describe('Discover session panel CSV export', { tag: '@local-stateful-classic' }, () => {
  // Report generation can take up to two minutes on shared CI workers.
  spaceTest.setTimeout(150_000);

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  for (const { mode, sessionTitle } of [
    { mode: 'classic', sessionTitle: testData.SAVED_SEARCH_TITLE },
    { mode: 'ES|QL', sessionTitle: ESQL_SESSION_TITLE },
  ] as const) {
    spaceTest(
      `exports a ${mode} Discover session panel with the dashboard global time range`,
      async ({ apiServices, discoverScoutSpace, pageObjects, scoutSpace }) => {
        const dashboardId = await createDashboardWithSessionPanel(
          apiServices,
          scoutSpace.id,
          sessionTitle,
          `Reporting ${mode} global range dashboard ${scoutSpace.id}`,
          getSessionTab(mode, discoverScoutSpace)
        );
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect.poll(() => pageObjects.dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);

        const download = await pageObjects.dashboard.exportPanelAsCsv(sessionTitle);

        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    );

    spaceTest(
      `exports a ${mode} Discover session panel with a custom time range`,
      async ({ apiServices, discoverScoutSpace, page, pageObjects, scoutSpace }) => {
        const dashboardId = await createDashboardWithSessionPanel(
          apiServices,
          scoutSpace.id,
          sessionTitle,
          `Reporting ${mode} custom range dashboard ${scoutSpace.id}`,
          getSessionTab(mode, discoverScoutSpace)
        );
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect.poll(() => pageObjects.dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);

        await pageObjects.dashboard.openCustomizePanel(sessionTitle);
        await pageObjects.dashboard.enableCustomTimeRange();
        await pageObjects.dashboard.openDatePickerQuickMenu();
        await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_24 hours');
        await pageObjects.dashboard.saveCustomizePanel();

        await expect(
          page.testSubj.locator('embeddablePanelBadge-CUSTOM_TIME_RANGE_BADGE')
        ).toBeVisible();

        const download = await pageObjects.dashboard.exportPanelAsCsv(sessionTitle);

        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    );
  }
});
