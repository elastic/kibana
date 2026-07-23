/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

const FIRST_TAB_LABEL = 'Persisted data view';
const SECOND_TAB_LABEL = 'Flights data view';
const THIRD_TAB_LABEL = 'Ad hoc data view';
const FLIGHTS_DATA_VIEW = 'kibana_sample_data_flights';

spaceTest.describe(
  'Discover tabs - refresh uninitialized tabs',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'saves and reloads tabs that were not re-initialized after refresh',
      async ({ discoverScoutSpace, page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const sessionName = `Uninitialized tabs session ${Date.now()}`;
        const esqlQuery = 'FROM logstash-* | LIMIT 100';

        await spaceTest.step('create and load data view and ESQL tabs', async () => {
          await discoverScoutSpace.createDiscoverSession({
            title: sessionName,
            tabs: [
              {
                id: 'persisted-data-view',
                label: FIRST_TAB_LABEL,
                data_source: {
                  type: 'data_view_reference',
                  ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
                },
              },
              {
                id: 'flights-data-view',
                label: SECOND_TAB_LABEL,
                data_source: {
                  type: 'data_view_reference',
                  ref_id: discoverScoutSpace.getDataViewId(FLIGHTS_DATA_VIEW),
                },
              },
              {
                id: 'ad-hoc-data-view',
                label: THIRD_TAB_LABEL,
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'logst*',
                  time_field: '@timestamp',
                },
              },
              {
                id: 'esql',
                label: 'ES|QL',
                data_source: {
                  type: 'esql',
                  query: esqlQuery,
                },
              },
            ],
          });

          await discover.loadSavedSearch(sessionName);
          await unifiedTabs.selectTab(3);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);
        });

        await spaceTest.step('save after refresh without visiting all tabs', async () => {
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();

          await discover.saveSearch(sessionName);
          expect(await discover.getCurrentQueryName()).toBe(sessionName);
        });

        await spaceTest.step('load the session and restore each tab type', async () => {
          await discover.clickNewSearch();
          await discover.loadSavedSearch(sessionName);

          await expect(unifiedTabs.getTabs()).toHaveCount(4);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(FIRST_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(SECOND_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(FLIGHTS_DATA_VIEW);

          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(THIRD_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe('logst*');

          await unifiedTabs.selectTab(3);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);
        });
      }
    );
  }
);
