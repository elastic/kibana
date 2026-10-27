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
import {
  DASHBOARD_BAD_FILTERS_TITLE,
  DASHBOARD_FILTER_BAR_ARCHIVE,
  DASHBOARD_FILTER_BAR_EMPTY_TITLE,
  DASHBOARD_FILTER_BAR_PIE_TITLE,
} from '../constants';
import { filterOnPieSlice, getPieSliceCount, POLL_OPTIONS } from '../../utils/chart_debug';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

let emptyDashboardId = '';
let pieDashboardId = '';
let badFiltersDashboardId = '';

// Focus: how the filter bar behaves: its visibility, its field list, and how filters persist and load
spaceTest.describe('Dashboard filter bar', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_FILTER_BAR_ARCHIVE);
    emptyDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      DASHBOARD_FILTER_BAR_EMPTY_TITLE
    );
    pieDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      DASHBOARD_FILTER_BAR_PIE_TITLE
    );
    badFiltersDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      DASHBOARD_BAD_FILTERS_TITLE
    );

    // The bad filters dashboard references an index pattern that must no longer exist
    const missingIndexPatternId = findImportedSavedObjectId(
      imported,
      'index-pattern',
      'to-be-deleted'
    );
    await kbnClient.savedObjects.delete({
      type: 'index-pattern',
      id: missingIndexPatternId,
      space: scoutSpace.id,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, context }) => {
    // The elastic-charts debug state is read while a chart mounts, so enable it before navigation
    await context.addInitScript(() => {
      (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
    });
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows the filter bar', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    const addFilterButton = page.testSubj.locator('addFilter');

    await spaceTest.step('on an empty dashboard', async () => {
      await dashboard.openDashboardWithIdInEditMode(emptyDashboardId);
      await expect(addFilterButton).toBeVisible();
    });

    await spaceTest.step('for visualizations with no search source', async () => {
      await dashboard.addEmbeddable('Rendering Test: input control');
      await expect(addFilterButton).toBeVisible();
    });
  });

  spaceTest('filter editor field list', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    const fieldList = page.components.comboBox('filterFieldSuggestionList');

    const expectFieldSuggestionsToInclude = async (field: string) => {
      await page.testSubj.click('addFilter');
      expect(await fieldList.getAllVisibleOptions()).toContain(field);
      await page.testSubj.click('cancelSaveFilter');
      await expect(page.testSubj.locator('addFilterPopover')).toBeHidden();
    };

    await dashboard.openDashboardWithIdInEditMode(emptyDashboardId);

    await spaceTest.step('shows the data view of a visualization when one is added', async () => {
      await dashboard.addEmbeddable('Rendering Test: animal sounds pie');
      await dashboard.waitForRenderComplete();
      await expectFieldSuggestionsToInclude('animal');
    });

    await spaceTest.step('works when a visualization with no data view is added', async () => {
      await dashboard.addEmbeddable('Rendering Test: markdown');
      await dashboard.waitForRenderComplete();
      await expectFieldSuggestionsToInclude('animal');
    });
  });

  spaceTest('filter pills', async ({ page, pageObjects }) => {
    const { dashboard, filterBar, queryBar } = pageObjects;

    const expectPieSliceCount = (count: number) =>
      expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(count);

    const saveCopyAs = async (title: string) => {
      await dashboard.ensureEditMode();
      await dashboard.saveDashboardAsCopy(title);
      await dashboard.waitForRenderComplete();
    };

    // Goes through the listing page so the global (pinned) filters carry over
    const openSavedDashboardFromListing = async (title: string) => {
      await page
        .locator('[data-test-subj~="breadcrumb"]')
        .filter({ hasText: /^Dashboards$/ })
        .click();
      await dashboard.clickDashboardTitleLink(title);
    };

    await dashboard.openDashboardWithId(pieDashboardId);

    await spaceTest.step('are not selected by default', async () => {
      expect(await filterBar.getFilterCount()).toBe(0);
    });

    await spaceTest.step('are added when a pie chart slice is clicked', async () => {
      await expectPieSliceCount(5);
      await filterOnPieSlice(page, '4886');
      await expect.poll(() => filterBar.getFilterCount()).toBe(1);
      await expectPieSliceCount(1);
    });

    await spaceTest.step('are preserved after saving a dashboard', async () => {
      await saveCopyAs('with filters');
      expect(await filterBar.getFilterCount()).toBe(1);
      await expectPieSliceCount(1);
    });

    await spaceTest.step('are preserved after opening a dashboard saved with filters', async () => {
      await dashboard.goto();
      await dashboard.clickDashboardTitleLink('with filters');
      await queryBar.submitQuery();
      expect(await filterBar.getFilterCount()).toBe(1);
      await expectPieSliceCount(1);
    });

    await spaceTest.step("restoring filters doesn't break the back button", async () => {
      await page.goBack();
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
      await page.goForward();
      await dashboard.waitForRenderComplete();
      await queryBar.submitQuery();
      await expectPieSliceCount(1);
    });

    await spaceTest.step("saving with a pinned filter doesn't unpin it", async () => {
      await filterBar.toggleFilterPinned('bytes');
      await saveCopyAs('saved with pinned filters');
      expect(await filterBar.hasFilter({ field: 'bytes', pinned: true })).toBe(true);
      await expectPieSliceCount(1);
    });

    await spaceTest.step(
      "navigating to a dashboard with a global filter doesn't unpin it if the same filter is saved with the dashboard",
      async () => {
        await page.reload();
        await dashboard.waitForRenderComplete();
        await openSavedDashboardFromListing('with filters');
        expect(await filterBar.hasFilter({ field: 'bytes', pinned: true })).toBe(true);
        await expectPieSliceCount(1);
      }
    );

    await spaceTest.step("pinned filters aren't saved", async () => {
      await filterBar.removeFilter('bytes');
      await openSavedDashboardFromListing('saved with pinned filters');
      expect(await filterBar.getFilterCount()).toBe(0);
      await expectPieSliceCount(5);
    });
  });

  spaceTest('saved search filtering', async ({ pageObjects }) => {
    const { dashboard, dataGrid, filterBar } = pageObjects;

    await dashboard.openDashboardWithIdInEditMode(emptyDashboardId);
    await dashboard.addSavedSearch('Rendering Test: saved search');
    await dashboard.waitForRenderComplete();

    await spaceTest.step('filters are added when a cell filter button is clicked', async () => {
      await dataGrid.filterCell({ rowIndex: 0, columnId: 'bytes', mode: 'for' });
      await expect.poll(() => filterBar.getFilterCount()).toBe(1);
    });
  });

  spaceTest('bad filters are loaded properly', async ({ pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;

    await dashboard.openDashboardWithId(badFiltersDashboardId);

    const expectFilter = (field: string, value: string, enabled: boolean) =>
      expect.poll(() => filterBar.hasFilter({ field, value, enabled })).toBe(true);

    await spaceTest.step(
      'filter with a non-existent index pattern renders if it matches a field',
      () => expectFilter('name', 'moo', false)
    );

    await spaceTest.step('filter with a non-existent field renders in warning mode', () =>
      expectFilter('baad-field', 'warn', false)
    );

    await spaceTest.step(
      'filter from an unrelated index pattern is still applicable if the field name is found',
      () => expectFilter('@timestamp', '123', true)
    );

    await spaceTest.step(
      'filter from an unrelated index pattern renders as a warning if the field name is not found',
      () => expectFilter('extension', 'warn', true)
    );

    await spaceTest.step(
      'filter without an index pattern renders as a warning if the dashboard has an index pattern',
      () => expectFilter('banana', 'warn', true)
    );
  });
});
