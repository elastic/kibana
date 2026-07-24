/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures/common';

spaceTest.describe('Discover view mode toggle', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.dataGrid.waitForLoad();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('should show Documents tab', async ({ page }) => {
    await expect(page.testSubj.locator('dscViewModeToggle')).toBeVisible();
    await expect(page.testSubj.locator('unifiedDataTableToolbar')).toBeVisible();

    const documentsTab = page.testSubj.locator('dscViewModeDocumentButton');
    await expect(documentsTab).toHaveAttribute('aria-selected', 'true');
  });

  spaceTest('should show an error callout on invalid query', async ({ page, pageObjects }) => {
    await pageObjects.queryBar.setQuery('@message::');
    await pageObjects.discover.submitQuery();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();

    await pageObjects.queryBar.setQuery('');
    await pageObjects.discover.submitQuery();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeHidden();
  });

  spaceTest('should hide view mode toggle in fullscreen mode', async ({ page }) => {
    await expect(page.testSubj.locator('dscViewModeToggle')).toBeVisible();

    await page.testSubj.click('dataGridFullScreenButton');
    await expect(page.testSubj.locator('dscViewModeToggle')).toBeHidden();

    await page.testSubj.click('dataGridFullScreenButton');
    await expect(page.testSubj.locator('dscViewModeToggle')).toBeVisible();
  });

  spaceTest(
    'should not show view mode toggle for ES|QL searches',
    async ({ page, pageObjects }) => {
      await expect(page.testSubj.locator('dscViewModeToggle')).toBeVisible();

      const documentsTab = page.testSubj.locator('dscViewModeDocumentButton');
      await expect(documentsTab).toHaveAttribute('aria-selected', 'true');

      await pageObjects.discover.selectTextBaseLang();

      await expect(page.testSubj.locator('dscViewModeToggle')).toBeHidden();
      await expect(page.testSubj.locator('discoverQueryTotalHits')).toBeVisible();
      await expect(page.testSubj.locator('unifiedDataTableToolbar')).toBeVisible();
    }
  );
});
