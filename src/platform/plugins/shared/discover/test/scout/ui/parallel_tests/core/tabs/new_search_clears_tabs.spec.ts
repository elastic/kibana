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
const SECOND_TAB_LABEL = 'Ad hoc data view';

spaceTest.describe(
  'Discover tabs - new search clears tabs',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
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
      'clears saved and unsaved tabs when starting a new session',
      async ({ discoverScoutSpace, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const sessionName = `Clear tabs Discover session ${Date.now()}`;

        await spaceTest.step('clear a loaded multi-tab session', async () => {
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
                id: 'ad-hoc-data-view',
                label: SECOND_TAB_LABEL,
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'logs*',
                  time_field: '@timestamp',
                },
              },
            ],
          });

          await discover.loadSavedSearch(sessionName);

          expect(await unifiedTabs.getTabLabels()).toStrictEqual([
            FIRST_TAB_LABEL,
            SECOND_TAB_LABEL,
          ]);

          await discover.clickNewSearch();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });

        await spaceTest.step('clear unsaved tabs', async () => {
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);

          await discover.clickNewSearch();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });
      }
    );
  }
);
