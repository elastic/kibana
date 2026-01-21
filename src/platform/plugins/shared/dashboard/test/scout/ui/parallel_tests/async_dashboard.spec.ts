/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, expect, tags } from '@kbn/scout';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { PageObjects, ScoutPage } from '@kbn/scout';

const SAMPLE_DATA_SET_ID = 'flights';
const SAMPLE_DATA_DASHBOARD_ID = '7adfa750-4c81-11e8-b3d7-01146121b73d';
const SAMPLE_DATA_VIEW = 'Kibana Sample Data Flights';
const SAMPLE_DATA_TIME_RANGE = 'sample_data range';

const SAMPLE_DATA_RANGE = [
  {
    from: 'now-30d',
    to: 'now+40d',
    display: 'sample data range',
  },
  {
    from: 'now/d',
    to: 'now/d',
    display: 'Today',
  },
  {
    from: 'now/w',
    to: 'now/w',
    display: 'This week',
  },
  {
    from: 'now-15m',
    to: 'now',
    display: 'Last 15 minutes',
  },
  {
    from: 'now-30m',
    to: 'now',
    display: 'Last 30 minutes',
  },
  {
    from: 'now-1h',
    to: 'now',
    display: 'Last 1 hour',
  },
  {
    from: 'now-24h',
    to: 'now',
    display: 'Last 24 hours',
  },
  {
    from: 'now-7d',
    to: 'now',
    display: 'Last 7 days',
  },
  {
    from: 'now-30d',
    to: 'now',
    display: 'Last 30 days',
  },
  {
    from: 'now-90d',
    to: 'now',
    display: 'Last 90 days',
  },
  {
    from: 'now-1y',
    to: 'now',
    display: 'Last 1 year',
  },
];

spaceTest.describe('Sample data dashboard', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ kbnClient, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.uiSettings.set({
      [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: JSON.stringify(SAMPLE_DATA_RANGE),
    });

    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/s/${scoutSpace.id}/api/sample_data/${SAMPLE_DATA_SET_ID}`,
      });
    } catch {
      // Ignore missing sample data
    }

    await kbnClient.request({
      method: 'POST',
      path: `/s/${scoutSpace.id}/api/sample_data/${SAMPLE_DATA_SET_ID}`,
    });

    await expect
      .poll(
        async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `/s/${scoutSpace.id}/api/data_views`,
          });
          const dataViews =
            (response.data as { data_view?: Array<{ title?: string; name?: string }> } | undefined)
              ?.data_view ?? [];
          const hasSampleDataView = dataViews.some(
            (dataView) => dataView.name === SAMPLE_DATA_VIEW || dataView.title === SAMPLE_DATA_VIEW
          );
          return hasSampleDataView ? 1 : 0;
        },
        // Sample data install can take longer than Scout's default polling window.
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto();
    await pageObjects.discover.selectDataView(SAMPLE_DATA_VIEW);
    await pageObjects.datePicker.setCommonlyUsedTime(SAMPLE_DATA_TIME_RANGE);
    await pageObjects.discover.waitUntilSearchingHasFinished();
    expect(await pageObjects.discover.getHitCountInt()).toBeGreaterThan(0);
  });

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/s/${scoutSpace.id}/api/sample_data/${SAMPLE_DATA_SET_ID}`,
      });
    } catch {
      // Ignore missing sample data
    }
    await scoutSpace.uiSettings.unset(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);
  });

  const openFlightsDashboard = async (page: ScoutPage, pageObjects: PageObjects) => {
    await page.gotoApp('dashboards', { hash: `/view/${SAMPLE_DATA_DASHBOARD_ID}` });
    await pageObjects.datePicker.setCommonlyUsedTime(SAMPLE_DATA_TIME_RANGE);
    await pageObjects.dashboard.waitForRenderComplete();
    await expect.poll(async () => page.testSubj.locator('xyVisChart').count()).toBeGreaterThan(0);
  };

  const openDiscoverAndExpectHits = async (pageObjects: PageObjects) => {
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await expect.poll(async () => pageObjects.discover.getHitCountInt()).toBeGreaterThan(0);
  };

  const expectSavedSearchRowsRendered = async (page: ScoutPage) => {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const docElement = document.querySelector('[data-document-number]');
          const docCount = Number(docElement?.getAttribute('data-document-number') ?? '0');
          const rowCount = document.querySelectorAll(
            '[data-test-subj="docTableExpandToggleColumn"]'
          ).length;
          return docCount > 0 || rowCount > 0;
        })
      )
      .toBe(true);
  };

  const expectControlCount = async (page: ScoutPage, count: number) => {
    const controls = page.testSubj.locator('control-frame');
    await expect(controls).toHaveCount(count);
  };

  const expectTagCloudRendered = async (page: ScoutPage) => {
    const tagClouds = page.testSubj.locator('tagCloudVisualization');
    const textNodes = tagClouds.locator('text');
    await expect
      .poll(async () => {
        const [cloudCount, textCount] = await Promise.all([tagClouds.count(), textNodes.count()]);
        return cloudCount === 0 || textCount > 0;
      })
      .toBe(true);
  };

  spaceTest('should launch sample flights data set dashboard', async ({ page, pageObjects }) => {
    await spaceTest.step('open flights dashboard and validate chart', async () => {
      await openFlightsDashboard(page, pageObjects);
    });

    await spaceTest.step('open Discover and verify hits', async () => {
      await openDiscoverAndExpectHits(pageObjects);
    });

    await spaceTest.step('return to dashboard and validate chart', async () => {
      await openFlightsDashboard(page, pageObjects);
    });

    await expect.poll(async () => page.testSubj.locator('xyVisChart').count()).toBeGreaterThan(0);
  });

  spaceTest('toggle from Discover to Dashboard attempt 1', async ({ page, pageObjects }) => {
    await spaceTest.step('open Discover and verify hits', async () => {
      await openDiscoverAndExpectHits(pageObjects);
    });

    await spaceTest.step('open flights dashboard and validate chart', async () => {
      await openFlightsDashboard(page, pageObjects);
    });

    await expect.poll(async () => page.testSubj.locator('xyVisChart').count()).toBeGreaterThan(0);
  });

  spaceTest('toggle from Discover to Dashboard attempt 2', async ({ page, pageObjects }) => {
    await spaceTest.step('open Discover and verify hits', async () => {
      await openDiscoverAndExpectHits(pageObjects);
    });

    await spaceTest.step('open flights dashboard and validate panels', async () => {
      await openFlightsDashboard(page, pageObjects);
      await expectSavedSearchRowsRendered(page);
      await expectControlCount(page, 3);
      await expectTagCloudRendered(page);
      await expect(page.locator('.vgaVis__view')).toBeVisible();
    });

    await expect.poll(async () => page.testSubj.locator('xyVisChart').count()).toBeGreaterThan(0);
  });
});
