/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// Document counts in the animals archive: all animals, and cats only
const ANIMALS_COUNT = 23;
const CATS_COUNT = 11;

let animalsDashboardId = '';

// Focus: how the filter bar behaves: its visibility, its field list, and how filters persist and load
spaceTest.describe('Dashboard filter bar', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();

    await apiServices.dataViews.create({
      id: 'filter-bar-animals',
      title: 'animals-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });

    animalsDashboardId = await apiServices.dashboard.create(
      {
        title: 'Filter bar: animals',
        time_range: { from: '2018-01-01T00:00:00.000Z', to: '2018-04-13T00:00:00.000Z' },
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 15 },
            config: {
              type: 'metric',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'animals-*',
                time_field: '@timestamp',
              },
              metrics: [{ type: 'primary', operation: 'count' }],
            },
          },
        ],
      },
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    // The privileged role can't read the animals-* index in serverless security projects
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows panel data view fields on a dashboard with panels', async ({ pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithIdInEditMode(animalsDashboardId);
    await pageObjects.dashboard.waitForRenderComplete();

    // The filter editor lists the fields of the data view used by the panel
    expect(await pageObjects.filterBar.getFilterEditorFields()).toContain('animal');
  });

  spaceTest('filter pills', async ({ page, pageObjects }) => {
    const { dashboard, filterBar, queryBar } = pageObjects;

    // The dashboard has a single metric panel with a single tile
    const expectMetricValue = (value: number) =>
      expect(page.testSubj.locator('mtrVis').locator('.echMetricText__valueBlock')).toHaveText(
        String(value)
      );

    const saveCopyAs = async (title: string) => {
      await dashboard.ensureEditMode();
      await dashboard.saveDashboardAsCopy(title);
      await dashboard.waitForRenderComplete();
    };

    // Goes through the listing page so the global (pinned) filters carry over
    const openSavedDashboardFromListing = async (title: string) => {
      await dashboard.navigateToListingFromCurrentDashboard();
      await dashboard.clickDashboardTitleLink(title);
    };

    await dashboard.openDashboardWithId(animalsDashboardId);

    await spaceTest.step('are added through the filter bar', async () => {
      // No filters are selected by default
      expect(await filterBar.getFilterCount()).toBe(0);
      await expectMetricValue(ANIMALS_COUNT);
      await filterBar.addFilter({ field: 'animal', operator: 'is', value: 'cat' });
      await expect.poll(() => filterBar.getFilterCount()).toBe(1);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step('are preserved after saving a dashboard', async () => {
      await saveCopyAs('with filters');
      expect(await filterBar.getFilterCount()).toBe(1);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step('are preserved after opening a dashboard saved with filters', async () => {
      await dashboard.goto();
      await dashboard.clickDashboardTitleLink('with filters');
      await queryBar.submitQuery();
      expect(await filterBar.getFilterCount()).toBe(1);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step("restoring filters doesn't break the back button", async () => {
      await page.goBack();
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
      await page.goForward();
      await dashboard.waitForRenderComplete();
      await queryBar.submitQuery();
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step("saving with a pinned filter doesn't unpin it", async () => {
      await filterBar.toggleFilterPinned('animal');
      await saveCopyAs('saved with pinned filters');
      expect(await filterBar.hasFilter({ field: 'animal', pinned: true })).toBe(true);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step(
      "navigating to a dashboard with a global filter doesn't unpin it if the same filter is saved with the dashboard",
      async () => {
        await page.reload();
        await dashboard.waitForRenderComplete();
        await openSavedDashboardFromListing('with filters');
        expect(await filterBar.hasFilter({ field: 'animal', pinned: true })).toBe(true);
        await expectMetricValue(CATS_COUNT);
      }
    );

    await spaceTest.step("pinned filters aren't saved", async () => {
      await filterBar.removeFilter('animal');
      await openSavedDashboardFromListing('saved with pinned filters');
      expect(await filterBar.getFilterCount()).toBe(0);
      await expectMetricValue(ANIMALS_COUNT);
    });
  });
});
