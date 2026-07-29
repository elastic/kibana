/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL column sorting: sort state (including on computed/custom columns)
 * persists across save, reload, reopening the saved search, and viewing the
 * saved search as a dashboard panel.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest, testData } from '../../fixtures';

spaceTest.describe('Discover ES|QL view - sorting', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'persists a field sort across save, reload, and reopening the saved search',
    async ({ page, pageObjects }) => {
      spaceTest.setTimeout(180_000);
      const { discover, dashboard, unifiedFieldList } = pageObjects;
      const savedSearchName = 'testSorting';

      await spaceTest.step('sort a field descending then ascending', async () => {
        await discover.codeEditor.setCodeEditorValue(
          'from logstash-* | sort @timestamp | limit 100'
        );
        await discover.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.clickFieldListItemAdd('bytes');
        await discover.waitUntilTabIsLoaded();

        await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('1,623');
        await expect(page.testSubj.locator('dataGridColumnSortingButton')).toHaveText(
          'Sort fields'
        );

        await discover.clickFieldSort('bytes', 'Sort High-Low');
        await discover.waitUntilTabIsLoaded();
        await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('17,966');
        await expect(page.testSubj.locator('dataGridColumnSortingButton')).toHaveText(
          'Sort fields1'
        );
      });

      await spaceTest.step('sort persists through save, reload, and reopening', async () => {
        await discover.saveSearch(savedSearchName);
        await discover.waitUntilTabIsLoaded();
        await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('17,966');

        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('17,966');

        await discover.clickNewSearch();
        await discover.waitUntilTabIsLoaded();
        await discover.loadSavedSearch(savedSearchName);
        await discover.waitUntilTabIsLoaded();
        await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('17,966');
      });

      await spaceTest.step('sorting a second field ascending updates the grid', async () => {
        await discover.clickFieldSort('bytes', 'Sort Low-High');
        await discover.waitUntilTabIsLoaded();
        await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('0');

        await unifiedFieldList.clickFieldListItemAdd('extension');
        await discover.waitUntilTabIsLoaded();
        await discover.clickFieldSort('extension', 'Sort A-Z');
        await expect.poll(async () => (await discover.getDataGridRows())[0][2]).toBe('css');
        await expect(page.testSubj.locator('dataGridColumnSortingButton')).toHaveText(
          'Sort fields2'
        );
      });

      await spaceTest.step('sort persists as a dashboard panel', async () => {
        await discover.saveSearch(savedSearchName);
        await discover.waitUntilTabIsLoaded();

        await dashboard.goto();
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(savedSearchName);
        await dashboard.waitForRenderComplete();

        // The embedded saved-search panel renders the same grid markup as
        // Discover, so the same row-reading helper applies here.
        await expect.poll(async () => (await discover.getDataGridRows())[0][2]).toBe('css');
      });
    }
  );

  spaceTest('sorts on a computed (custom) column', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;
    const savedSearchName = 'testSortingForCustomVars';

    await discover.codeEditor.setCodeEditorValue(
      'from logstash-* | sort @timestamp | limit 100 | keep bytes | eval var0 = abs(bytes) + 1'
    );
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();
    await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('1,624');
    await expect(page.testSubj.locator('dataGridColumnSortingButton')).toHaveText('Sort fields');

    await discover.clickFieldSort('var0', 'Sort High-Low');
    await discover.waitUntilTabIsLoaded();
    await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('17,967');
    await expect(page.testSubj.locator('dataGridColumnSortingButton')).toHaveText('Sort fields1');

    await discover.saveSearch(savedSearchName);
    await discover.waitUntilTabIsLoaded();
    await page.reload();
    await discover.waitUntilTabIsLoaded();
    await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('17,967');

    await discover.clickFieldSort('var0', 'Sort Low-High');
    await discover.waitUntilTabIsLoaded();
    await expect.poll(async () => (await discover.getDataGridRows())[0][1]).toBe('1');
    await expect(page.testSubj.locator('dataGridColumnSortingButton')).toHaveText('Sort fields1');
  });
});
