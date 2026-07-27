/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const TSDB_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb';

const DEFAULT_COLUMNS = ['message', 'extension', 'DestCountry'];

spaceTest.describe('Discover default columns', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
    // Loads kbn_archiver/discover (logstash-* data view) + sets defaultIndex + timepicker.
    // loadFlightsDataView: true also loads kbn_archiver/kibana_sample_data_flights_index_pattern.
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

  spaceTest('should render default columns', async ({ page, pageObjects }) => {
    // DestCountry is the distinguishing default column; its presence confirms all defaults rendered
    await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'visible' });
    expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
      '@timestamp',
      'message',
      'extension',
      'DestCountry',
    ]);
  });

  spaceTest(
    'should render only available default columns after switching data views',
    async ({ page, pageObjects }) => {
      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);

      await pageObjects.discover.selectDataView('Kibana Sample Data Logs (TSDB)');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // 'timestamp' (no @) is new here — its presence signals the TSDB columns have rendered
      await page.testSubj.locator('dataGridHeaderCell-timestamp').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
        'timestamp',
        'message',
        'extension',
      ]);

      await pageObjects.discover.selectDataView('kibana_sample_data_flights');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // 'DestCountry' was absent in TSDB — its appearance signals flights columns have rendered
      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual(['timestamp', 'DestCountry']);

      await pageObjects.discover.selectDataView('logstash-*');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // '@timestamp' (with @) is new — flights used 'timestamp' (no @)
      await page.testSubj.locator('dataGridHeaderCell-@timestamp').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual(['@timestamp', 'extension']);
    }
  );

  spaceTest(
    'should combine selected columns and default columns after switching data views',
    async ({ page, pageObjects }) => {
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await pageObjects.unifiedFieldList.clickFieldListItemRemove('DestCountry');
      await pageObjects.unifiedFieldList.clickFieldListItemRemove('message');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      // 'bytes' was just added — wait for it before asserting the full set
      await page.testSubj.locator('dataGridHeaderCell-bytes').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
        '@timestamp',
        'extension',
        'bytes',
      ]);

      await pageObjects.discover.selectDataView('Kibana Sample Data Logs (TSDB)');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // 'timestamp' (no @) signals the TSDB columns have rendered
      await page.testSubj.locator('dataGridHeaderCell-timestamp').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
        'timestamp',
        'extension',
        'bytes',
        'message',
      ]);

      await pageObjects.discover.selectDataView('logstash-*');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // '@timestamp' (with @) is new — TSDB used 'timestamp' (no @)
      await page.testSubj.locator('dataGridHeaderCell-@timestamp').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
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

      await page.testSubj.locator('dataGridHeaderCell-DestCountry').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);

      await pageObjects.discover.selectDataView('kibana_sample_data_flights');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // 'timestamp' (no @) is new — logstash used '@timestamp'
      await page.testSubj.locator('dataGridHeaderCell-timestamp').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual([
        'timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);
    }
  );
});
