/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');

  const { common, discover, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    enableESQL: true,
  };

  describe('discover esql formatting', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles([
        'kibana_admin',
        'test_logstash_reader',
        'kibana_sample_read',
      ]);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.load(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await discover.waitUntilTabIsLoaded();
    });

    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    describe('ES|QL results formatting with columnsMeta', () => {
      it('should have access to kibana_sample_data_flights via ES|QL as prerequesite for next test', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery =
          'FROM kibana_sample_data_flights | SORT timestamp DESC | LIMIT 1 | KEEP DistanceMiles';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const expectedValue = '5,743.838';

        // 1. Verify the value in the data grid cell
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be(expectedValue);

        // 2. Add DistanceMiles as a separate column and verify
        await unifiedFieldList.clickFieldListItemAdd('DistanceMiles');
        await discover.waitUntilTabIsLoaded();
        const columnCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await columnCell.getVisibleText()).to.be(expectedValue);

        // 3. Verify the value in doc viewer flyout
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await discover.isShowingDocViewer();
        const flyoutValue = await testSubjects.getVisibleText(
          'tableDocViewRow-DistanceMiles-value'
        );
        expect(flyoutValue).to.be(expectedValue);
        await dataGrid.closeFlyout();
      });

      it('should format ES|QL columns using columnsMeta when type differs from data view field', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        // This query creates columns with ROW that have the same names as fields in kibana_sample_data_flights
        // but with different types (string arrays instead of numbers)
        // The DistanceMiles field in the data view is numeric, but ES|QL returns it as a string array
        const testQuery =
          'ROW DistanceMiles = ["w1", "w2", "w3"], recent = ["w1", "w3"] | EVAL DistanceMiles = COALESCE(recent, DistanceMiles)';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        // The DistanceMiles field should display [w1, w3] (the result of COALESCE)
        // not attempt to use numeric formatting from the data view
        const expectedValue = '[w1, w3]';

        // 1. Verify the Summary column shows the string array values correctly
        const summaryCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const summaryText = await summaryCell.getVisibleText();
        expect(summaryText).to.be('recent[w1, w3]DistanceMiles[w1, w3]');

        // 2. Add DistanceMiles as a separate column and verify
        await unifiedFieldList.clickFieldListItemAdd('DistanceMiles');
        await discover.waitUntilTabIsLoaded();
        const columnCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const columnText = await columnCell.getVisibleText();
        expect(columnText).to.be(expectedValue);

        // 3. Verify the value in doc viewer flyout
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await discover.isShowingDocViewer();
        const flyoutValue = await testSubjects.getVisibleText(
          'tableDocViewRow-DistanceMiles-value'
        );
        expect(flyoutValue).to.be(expectedValue);
        await dataGrid.closeFlyout();
      });

      it('should correctly format ES|QL computed columns not in data view', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        // Create a computed column that doesn't exist in the data view
        const testQuery =
          'from logstash-* | sort @timestamp | limit 10 | eval custom_bytes = bytes * 2';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const expectedBytesValue = '1,623';
        const expectedBytesValue2 = '3,246';

        // 1. Verify bytes column shows the expected value in data grid
        const bytesCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        expect(await bytesCell.getVisibleText()).to.contain(expectedBytesValue);

        // 2. Add custom_bytes as a separate column and verify
        await unifiedFieldList.clickFieldListItemAdd('custom_bytes');
        await discover.waitUntilTabIsLoaded();
        const bytes2ColumnCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await bytes2ColumnCell.getVisibleText()).to.be(expectedBytesValue2);

        // 3. Verify both values in doc viewer flyout
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await discover.isShowingDocViewer();
        const bytesFlyoutValue = await testSubjects.getVisibleText('tableDocViewRow-bytes-value');
        expect(bytesFlyoutValue).to.be(expectedBytesValue);
        const bytes2FlyoutValue = await testSubjects.getVisibleText(
          'tableDocViewRow-custom_bytes-value'
        );
        expect(bytes2FlyoutValue).to.be(expectedBytesValue2);
        await dataGrid.closeFlyout();
      });
    });
  });
}
