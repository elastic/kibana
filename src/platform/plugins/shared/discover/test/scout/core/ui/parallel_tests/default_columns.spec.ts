/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const TSDB_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb';

const DEFAULT_COLUMNS = ['message', 'extension', 'DestCountry'];

spaceTest.describe('Discover default columns', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    await scoutSpace.savedObjects.load(TSDB_KBN_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
    await scoutSpace.uiSettings.set({ defaultColumns: DEFAULT_COLUMNS });
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultColumns', 'discover:modifyColumnsOnSwitch');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('should render default columns', async ({ pageObjects }) => {
    expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
      '@timestamp',
      'message',
      'extension',
      'DestCountry',
    ]);
  });

  spaceTest(
    'should render only available default columns after switching data views',
    async ({ page, pageObjects }) => {
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);

      await pageObjects.discover.selectDataView('Kibana Sample Data Logs (TSDB)');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Wait for both an arriving and a departing column: the arriving one alone can't
      // distinguish the reconciled state from a stale render that also contains it
      await page.testSubj.locator('dataGridHeaderCell-timestamp').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        'timestamp',
        'message',
        'extension',
      ]);

      await pageObjects.discover.selectDataView('kibana_sample_data_flights');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Arriving: DestCountry (absent in TSDB); departing: message and extension
      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-message').waitFor({ state: 'hidden' });
      await page.testSubj.locator('dataGridHeaderCell-extension').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        'timestamp',
        'DestCountry',
      ]);

      await pageObjects.discover.selectDataView('logstash-*');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Arriving: '@timestamp' (flights used 'timestamp'); departing: DestCountry
      await page.testSubj.locator('dataGridHeaderCell-@timestamp').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        '@timestamp',
        'extension',
      ]);
    }
  );

  spaceTest(
    'should combine selected columns and default columns after switching data views',
    async ({ page, pageObjects }) => {
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await pageObjects.unifiedFieldList.clickFieldListItemRemove('DestCountry');
      await pageObjects.unifiedFieldList.clickFieldListItemRemove('message');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      // Arriving: bytes; departing: DestCountry and message (just removed)
      await page.testSubj.locator('dataGridHeaderCell-bytes').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'hidden' });
      await page.testSubj.locator('dataGridHeaderCell-message').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        '@timestamp',
        'extension',
        'bytes',
      ]);

      await pageObjects.discover.selectDataView('Kibana Sample Data Logs (TSDB)');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Arriving: 'timestamp' (no @) and message; departing: '@timestamp'
      await page.testSubj.locator('dataGridHeaderCell-timestamp').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-message').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-@timestamp').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        'timestamp',
        'extension',
        'bytes',
        'message',
      ]);

      await pageObjects.discover.selectDataView('logstash-*');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Arriving: '@timestamp' (TSDB used 'timestamp'); departing: message
      await page.testSubj.locator('dataGridHeaderCell-@timestamp').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-message').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        '@timestamp',
        'extension',
        'bytes',
      ]);
    }
  );

  spaceTest(
    'should not change columns if discover:modifyColumnsOnSwitch is off',
    async ({ page, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'discover:modifyColumnsOnSwitch': false });
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();

      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);

      await pageObjects.discover.selectDataView('kibana_sample_data_flights');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Arriving: 'timestamp' (no @); departing: '@timestamp' — other columns stay unchanged
      // because discover:modifyColumnsOnSwitch is off
      await page.testSubj.locator('dataGridHeaderCell-timestamp').waitFor({ state: 'visible' });
      await page.testSubj.locator('dataGridHeaderCell-@timestamp').waitFor({ state: 'hidden' });
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        'timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);
    }
  );
});
