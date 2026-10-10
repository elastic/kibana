/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

const SORT_QUERY = 'from logstash-* | sort @timestamp | limit 100';
const COMPUTED_COLUMN_QUERY = `${SORT_QUERY} | keep bytes | eval var0 = abs(bytes) + 1`;

spaceTest.describe('Discover ES|QL sorting', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('sorts ES|QL results', async ({ page, pageObjects }) => {
    const { discover, dataGrid, unifiedFieldList } = pageObjects;
    const sortButton = page.testSubj.locator('dataGridColumnSortingButton');

    await spaceTest.step('sorts a column in both directions', async () => {
      await discover.writeAndSubmitEsqlQuery(SORT_QUERY);
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItemAdd('bytes');

      await expect(dataGrid.getCellValue(0, 'bytes')).toHaveText('1,623');
      await expect(sortButton).toHaveText('Sort fields');

      await dataGrid.sortColumn('bytes', 'Sort High-Low');
      await expect(dataGrid.getCellValue(0, 'bytes')).toHaveText('17,966');
      await expect(sortButton).toHaveText('Sort fields1');

      await dataGrid.sortColumn('bytes', 'Sort Low-High');
      await expect(dataGrid.getCellValue(0, 'bytes')).toHaveText('0');
      await expect(sortButton).toHaveText('Sort fields1');
    });

    await spaceTest.step('sorts on a computed column', async () => {
      // Steps share one browser context, so start from a new search: the ascending
      // `bytes` sort the previous step leaves behind survives the query change and puts
      // `bytes: 0` first, making `var0` read 1 rather than the query order's 1,624.
      await discover.clickNewSearch();
      await discover.waitUntilTabIsLoaded();

      await discover.writeAndSubmitEsqlQuery(COMPUTED_COLUMN_QUERY);

      await expect(dataGrid.getCellValue(0, 'var0')).toHaveText('1,624');

      await dataGrid.sortColumn('var0', 'Sort High-Low');
      await expect(dataGrid.getCellValue(0, 'var0')).toHaveText('17,967');

      await dataGrid.sortColumn('var0', 'Sort Low-High');
      await expect(dataGrid.getCellValue(0, 'var0')).toHaveText('1');
    });

    await spaceTest.step('sorts on multiple columns', async () => {
      await discover.clickNewSearch();
      await discover.waitUntilTabIsLoaded();

      await discover.writeAndSubmitEsqlQuery(SORT_QUERY);
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('extension');

      await dataGrid.sortColumn('bytes', 'Sort Low-High');
      await dataGrid.sortColumn('extension', 'Sort A-Z');

      await expect(dataGrid.getCellValue(0, 'bytes')).toHaveText('0');
      await expect(dataGrid.getCellValue(0, 'extension')).toHaveText('css');
      await expect(sortButton).toHaveText('Sort fields2');
    });
  });
});
