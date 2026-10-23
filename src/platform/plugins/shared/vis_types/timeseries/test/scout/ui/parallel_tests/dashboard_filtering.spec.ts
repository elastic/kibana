/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

const TSVB_FILTERING_ARCHIVE =
  'src/platform/plugins/shared/vis_types/timeseries/test/scout/ui/fixtures/kbn_archives/tsvb_dashboard_filtering.json';
const TSVB_FILTERING_DASHBOARD_TITLE = 'TSVB: dashboard filtering';
const POLL_OPTIONS = { timeout: 30_000 };

const getTexts = async (locator: ReturnType<ScoutPage['locator']>) =>
  (await locator.allTextContents()).map((text) => text.trim());

/** Everything the bytes filter is expected to change, one entry per TSVB visualization. */
const getTsvbSnapshot = async (page: ScoutPage) => ({
  timeSeriesNoData: await page
    .locator('[data-test-subj="timeseriesVis"] [data-test-subj="visNoResult"]')
    .count(),
  metric: await getTexts(page.testSubj.locator('tsvbMetricValue')),
  topN: await getTexts(page.testSubj.locator('tsvbTopNValue')),
  markdown: await getTexts(page.testSubj.locator('tsvbMarkdown')),
});

type TsvbSnapshot = Awaited<ReturnType<typeof getTsvbSnapshot>>;

/** Waits until two consecutive snapshots match, so every visualization has finished rendering. */
const getStableSnapshot = async (page: ScoutPage) => {
  let previous = '';
  let stable = {} as TsvbSnapshot;
  await expect
    .poll(
      async () => {
        stable = await getTsvbSnapshot(page);
        const serialized = JSON.stringify(stable);
        const isStable = serialized === previous;
        previous = serialized;
        return isStable;
      },
      { ...POLL_OPTIONS, intervals: [1000] }
    )
    .toBe(true);
  return stable;
};

// Soft so that one run reports every mismatching visualization
const softExpect = expect.configure({ soft: true });

spaceTest.describe('TSVB - dashboard filtering', { tag: testData.TSVB_DEPLOYMENT_TAGS }, () => {
  let dashboardId = '';

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(TSVB_FILTERING_ARCHIVE);
    const dashboard = imported.find(
      (obj) => obj.type === 'dashboard' && obj.title === TSVB_FILTERING_DASHBOARD_TITLE
    );
    if (!dashboard) {
      throw new Error(`Dashboard "${TSVB_FILTERING_DASHBOARD_TITLE}" not found in fixture`);
    }
    dashboardId = dashboard.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('applies and removes a dashboard filter', async ({ page, pageObjects }) => {
    const { dashboard, filterBar, queryBar } = pageObjects;

    await dashboard.openDashboardWithId(dashboardId);
    const unfiltered = await spaceTest.step('capture the unfiltered visualizations', () =>
      getStableSnapshot(page)
    );
    const snapshotKeys = Object.keys(unfiltered) as Array<keyof TsvbSnapshot>;

    await spaceTest.step('a filter that excludes all data empties the visualizations', async () => {
      await filterBar.addFilter({ field: 'bytes', operator: 'is', value: '12345678' });
      // first round of requests sometimes times out, refresh to fetch again
      await queryBar.submitQuery();
      await dashboard.waitForRenderComplete();

      await expect(
        page.locator('[data-test-subj="timeseriesVis"] [data-test-subj="visNoResult"]')
      ).toBeVisible();
      await expect
        .poll(() => getTexts(page.testSubj.locator('tsvbMetricValue')), POLL_OPTIONS)
        .toEqual(['0 custom template']);
      await expect
        .poll(() => getTexts(page.testSubj.locator('tsvbTopNValue')), POLL_OPTIONS)
        .toEqual(['-', '-']);

      const filtered = await getStableSnapshot(page);
      for (const key of snapshotKeys) {
        softExpect(
          filtered[key],
          `${key} should change when the filter excludes all data`
        ).not.toEqual(unfiltered[key]);
      }
    });

    await spaceTest.step('disabling the filter restores the visualizations', async () => {
      await filterBar.toggleFilterEnabled('bytes');
      await dashboard.waitForRenderComplete();

      const disabled = await getStableSnapshot(page);
      for (const key of snapshotKeys) {
        softExpect(disabled[key], `${key} should match the unfiltered visualization`).toEqual(
          unfiltered[key]
        );
      }
    });
  });
});
