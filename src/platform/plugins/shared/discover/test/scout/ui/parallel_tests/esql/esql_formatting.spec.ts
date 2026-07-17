/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL results formatting via `columnsMeta`: values must be formatted using
 * the type ES|QL actually returns, not the (possibly different) type of a
 * same-named field in the underlying data view.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover ES|QL results formatting', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(testData.FLIGHTS_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ enableESQL: true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults', 'enableESQL');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('has access to kibana_sample_data_flights via ES|QL', async ({ page, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;

    const testQuery =
      'FROM kibana_sample_data_flights | SORT timestamp DESC | LIMIT 1 | KEEP DistanceMiles';
    await discover.codeEditor.setCodeEditorValue(testQuery);
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    const expectedValue = '5,743.838';

    const summaryRows = await discover.getDataGridRows();
    expect(summaryRows[0][0]).toBe(expectedValue);

    await pageObjects.unifiedFieldList.clickFieldListItemAdd('DistanceMiles');
    await discover.waitUntilTabIsLoaded();
    const columnRows = await discover.getDataGridRows();
    expect(columnRows[0][0]).toBe(expectedValue);

    await dataGrid.openDocumentDetails({ rowIndex: 0 });
    expect(await discover.isShowingDocViewer()).toBe(true);
    await expect(page.testSubj.locator('tableDocViewRow-DistanceMiles-value')).toHaveText(
      expectedValue
    );
    await dataGrid.closeFlyout();
  });

  spaceTest(
    'formats a value using columnsMeta when its type differs from the data-view field',
    async ({ page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      // This query creates columns with the same names as fields in
      // kibana_sample_data_flights, but with different types (string arrays
      // instead of numbers). The data-view field is numeric, but ES|QL returns
      // a string array here, so formatting must follow the ES|QL type.
      // Extra columns (col1-col5) push the result past the table-view column
      // threshold so the grid renders the Summary view.
      const testQuery =
        'ROW DistanceMiles = ["w1", "w2", "w3"], recent = ["w1", "w3"], col1 = 1, col2 = 2, col3 = 3, col4 = 4, col5 = 5 | EVAL DistanceMiles = COALESCE(recent, DistanceMiles)';
      await discover.codeEditor.setCodeEditorValue(testQuery);
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();

      const expectedValue = '[w1, w3]';

      const summaryRows = await discover.getDataGridRows();
      expect(summaryRows[0][0]).toContain('recent[w1, w3]');
      expect(summaryRows[0][0]).toContain('DistanceMiles[w1, w3]');

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('DistanceMiles');
      await discover.waitUntilTabIsLoaded();
      const columnRows = await discover.getDataGridRows();
      expect(columnRows[0][0]).toBe(expectedValue);

      await pageObjects.dataGrid.openDocumentDetails({ rowIndex: 0 });
      expect(await discover.isShowingDocViewer()).toBe(true);
      await expect(page.testSubj.locator('tableDocViewRow-DistanceMiles-value')).toHaveText(
        expectedValue
      );
      await dataGrid.closeFlyout();
    }
  );

  spaceTest(
    'formats a computed ES|QL column that is not present in the data view',
    async ({ page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;
      const testQuery =
        'from logstash-* | sort @timestamp | limit 10 | eval custom_bytes = bytes * 2 | keep @timestamp, bytes, custom_bytes';
      await discover.codeEditor.setCodeEditorValue(testQuery);
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();

      const expectedBytesValue = '1,623';
      const expectedCustomBytesValue = '3,246';

      const bytesRows = await discover.getDataGridRows();
      expect(bytesRows[0][1]).toContain(expectedBytesValue);
      expect(bytesRows[0][2]).toContain(expectedCustomBytesValue);

      await dataGrid.openDocumentDetails({ rowIndex: 0 });
      expect(await discover.isShowingDocViewer()).toBe(true);
      await expect(page.testSubj.locator('tableDocViewRow-bytes-value')).toHaveText(
        expectedBytesValue
      );
      await expect(page.testSubj.locator('tableDocViewRow-custom_bytes-value')).toHaveText(
        expectedCustomBytesValue
      );
      await dataGrid.closeFlyout();
    }
  );
});
