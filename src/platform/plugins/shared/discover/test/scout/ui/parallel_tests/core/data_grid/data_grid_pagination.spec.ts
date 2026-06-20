/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover data-grid pagination controls and rows-per-page settings.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../../fixtures/common';

spaceTest.describe('Discover data grid pagination', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.dataGrid.waitUntilSearchingHasFinished();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'discover:rowHeightOption'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows pagination controls', async ({ page, pageObjects }) => {
    expect(await pageObjects.dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

    await expect(page.testSubj.locator('pagination-button-0')).toBeVisible();
    await expect(page.testSubj.locator('pagination-button-4')).toBeVisible();
    await expect(page.testSubj.locator('pagination-button-5')).toBeHidden();
  });

  spaceTest('shows the footer only on the last page', async ({ page }) => {
    const footer = page.testSubj.locator('unifiedDataTableFooter');

    await expect(footer).toBeHidden();

    await page.testSubj.click('pagination-button-next');
    await expect(footer).toBeHidden();

    await page.testSubj.click('pagination-button-4');
    await expect(footer).toBeVisible();
  });

  spaceTest('updates pagination when rows per page changes', async ({ page, pageObjects }) => {
    const { dataGrid } = pageObjects;

    expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
    await expect(page.testSubj.locator('pagination-button-0')).toBeVisible();
    await expect(page.testSubj.locator('pagination-button-4')).toBeVisible();

    await dataGrid.changeRowsPerPageTo(500);

    await expect.poll(() => dataGrid.getCurrentRowsPerPage()).toBe(500);
    await expect(page.testSubj.locator('pagination-button-1')).toBeHidden();
    await expect(page.testSubj.locator('unifiedDataTableFooter')).toBeVisible();
  });
});
