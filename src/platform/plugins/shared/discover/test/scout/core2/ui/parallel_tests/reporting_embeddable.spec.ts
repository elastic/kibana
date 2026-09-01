/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '../../../../../server/api/schema';
import { spaceTest, testData } from '../fixtures';

const ESQL_SESSION_TITLE = 'Reporting ES|QL session';

const createDashboardWithSavedSession = async (
  pageObjects: PageObjects,
  sessionTitle: string,
  dashboardTitle: string
) => {
  await pageObjects.dashboard.openNewDashboard();
  await pageObjects.datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
  await pageObjects.dashboard.addSavedSearch(sessionTitle);
  await pageObjects.dashboard.waitForRenderComplete();
  await pageObjects.dashboard.saveDashboard(dashboardTitle);
  await pageObjects.dashboard.ensureViewMode();
};

spaceTest.describe('Discover session panel CSV export', { tag: '@local-stateful-classic' }, () => {
  // Each scenario generates two reports, which can exceed Scout's default timeout under CI load.
  spaceTest.setTimeout(5 * 60_000);

  spaceTest.beforeAll(async ({ apiServices, discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await apiServices.discover.create(
      {
        title: ESQL_SESSION_TITLE,
        tabs: [
          {
            id: 'esql',
            label: 'Untitled',
            data_source: {
              type: 'esql',
              query:
                'FROM logstash-* | STATS average_bytes = AVG(bytes) BY extension | SORT average_bytes DESC',
            },
          },
        ],
      } satisfies DiscoverSessionApiDataInput,
      discoverScoutSpace.id
    );
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
      `exports a ${mode} Discover session panel with global and custom time ranges`,
      async ({ page, pageObjects, scoutSpace }) => {
        await createDashboardWithSavedSession(
          pageObjects,
          sessionTitle,
          `Reporting ${mode} dashboard ${scoutSpace.id}`
        );

        await spaceTest.step('exports with the dashboard global time range', async () => {
          await expect
            .poll(() => pageObjects.dashboard.getSavedSearchRowCount())
            .toBeGreaterThan(0);

          const download = await pageObjects.dashboard.exportPanelAsCsv(sessionTitle);

          expect(download.suggestedFilename()).toMatch(/\.csv$/);
        });

        await spaceTest.step('exports with a custom panel time range', async () => {
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
        });
      }
    );
  }
});
