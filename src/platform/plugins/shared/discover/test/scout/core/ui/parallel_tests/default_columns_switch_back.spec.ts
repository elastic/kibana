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
const FLIGHTS_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern';

const DEFAULT_COLUMNS = ['message', 'extension', 'DestCountry'];

// In serverless Observability, 'logstash-*' resolves the logs data source profile, and Discover
// restores the per-profile app state snapshot when switching BACK to a data view of a previously
// resolved profile (see discover_data_state_container.ts). The restored snapshot (the initial
// default columns) overrides the discover:modifyColumnsOnSwitch reconciliation asserted here, so
// this scenario runs everywhere except serverless Observability. It lives in its own file because
// Scout allows only one root describe (and tag set) per spec file.
const EXCLUDING_SERVERLESS_OBSERVABILITY_TAGS = [
  ...tags.stateful.all,
  ...tags.serverless.search,
  ...tags.serverless.security.complete,
];

spaceTest.describe(
  'Discover default columns - switching data views',
  { tag: EXCLUDING_SERVERLESS_OBSERVABILITY_TAGS },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await scoutSpace.savedObjects.load(FLIGHTS_KBN_ARCHIVE);
      await scoutSpace.savedObjects.load(TSDB_KBN_ARCHIVE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ defaultColumns: DEFAULT_COLUMNS });
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultColumns');
      await discoverScoutSpace.teardownDiscoverDefaults();
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
  }
);
