/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const VEGA_FILTERING_ARCHIVE =
  'src/platform/plugins/private/vis_types/vega/test/scout/ui/fixtures/kbn_archives/vega_dashboard_filtering.json';
const VEGA_FILTERING_DASHBOARD_TITLE = 'Vega: dashboard filtering';
const POLL_OPTIONS = { timeout: 30_000 };

const getVegaTexts = async (page: ScoutPage) =>
  (await page.locator('.vgaVis__view text').allTextContents()).map((text) => text.trim());

spaceTest.describe(
  'Vega visualization - dashboard filtering',
  { tag: tags.stateful.classic },
  () => {
    let dashboardId = '';

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      const imported = await scoutSpace.savedObjects.load(VEGA_FILTERING_ARCHIVE);
      const dashboard = imported.find(
        (obj) => obj.type === 'dashboard' && obj.title === VEGA_FILTERING_DASHBOARD_TITLE
      );
      if (!dashboard) {
        throw new Error(`Dashboard "${VEGA_FILTERING_DASHBOARD_TITLE}" not found in fixture`);
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
      await expect.poll(() => getVegaTexts(page), POLL_OPTIONS).toContain('5,000');
      const unfiltered = await getVegaTexts(page);

      await spaceTest.step('a filter that excludes all data empties the chart', async () => {
        await filterBar.addFilter({
          field: 'bytes',
          operator: 'is',
          value: '12345678',
        });
        // first round of requests sometimes times out, refresh to fetch again
        await queryBar.submitQuery();
        await dashboard.waitForRenderComplete();
        await expect.poll(() => getVegaTexts(page), POLL_OPTIONS).not.toContain('5,000');
      });

      await spaceTest.step('disabling the filter restores the chart', async () => {
        await filterBar.toggleFilterEnabled('bytes');
        await dashboard.waitForRenderComplete();
        await expect.poll(() => getVegaTexts(page), POLL_OPTIONS).toEqual(unfiltered);
      });
    });
  }
);
