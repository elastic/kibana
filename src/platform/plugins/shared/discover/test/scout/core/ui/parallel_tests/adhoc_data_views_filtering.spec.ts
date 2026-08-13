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

// Discover is a platform feature available across all deployment types.
spaceTest.describe(
  'Discover — adhoc data views (filtering and context navigation)',
  { tag: tags.deploymentAgnostic },
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
      'supports query and filtering on ad hoc data view',
      async ({ discoverScoutSpace, pageObjects }) => {
        const { discover, filterBar, queryBar } = pageObjects;

        await spaceTest.step('creates ad hoc data view', async () => {
          await discoverScoutSpace.createDiscoverSession({
            title: 'logstash-adhoc-query-test',
            tabs: [
              {
                id: 'main',
                label: 'Untitled',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'logstash*',
                  time_field: '@timestamp',
                },
              },
            ],
          });
          await discover.loadSavedSearch('logstash-adhoc-query-test');
        });

        await spaceTest.step('filters by nested field value and checks hit count', async () => {
          await filterBar.addFilter({
            field: 'nestedField.child',
            operator: 'is',
            value: 'nestedValue',
          });
          await discover.waitUntilSearchingHasFinished();

          expect(
            await filterBar.hasFilter({ field: 'nestedField.child', value: 'nestedValue' })
          ).toBe(true);
          expect(await discover.getHitCount()).toBe('1');

          await filterBar.removeFilter('nestedField.child');
          await discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('searches with a text query and verifies hit count', async () => {
          await queryBar.setQuery('test');
          await discover.submitQuery();
          await discover.waitUntilSearchingHasFinished();
          expect(await discover.getHitCount()).toBe('22');

          await queryBar.clearQuery();
          await discover.submitQuery();
          await discover.waitUntilSearchingHasFinished();
        });
      }
    );

    spaceTest(
      'preserves runtime field column in saved search after navigating through context view',
      async ({ discoverScoutSpace, page, pageObjects }) => {
        const { discover, dashboard, dataGrid } = pageObjects;

        await spaceTest.step(
          'creates ad hoc data view with runtime field and saves search',
          async () => {
            await discoverScoutSpace.createDiscoverSession({
              title: 'logst-ctx-runtimefield',
              tabs: [
                {
                  id: 'main',
                  label: 'Untitled',
                  data_source: {
                    type: 'data_view_spec',
                    index_pattern: 'logst*',
                    time_field: '@timestamp',
                    field_settings: {
                      '_bytes-runtimefield': {
                        type: 'keyword',
                        script: 'emit(doc["bytes"].value.toString())',
                      },
                    },
                  },
                  column_order: ['_bytes-runtimefield'],
                },
              ],
            });
          }
        );

        await spaceTest.step('add search to dashboard and navigates to context view', async () => {
          await dashboard.goto();
          await dashboard.openNewDashboard();
          await dashboard.addSavedSearch('logst-ctx-runtimefield');

          await dataGrid.openDocumentDetails({ rowIndex: 0 });
          const actions = await dataGrid.getRowActions();
          // Actions are: [0] View single document, [1] View surrounding documents
          await actions[1].click();

          // context/single-doc pages can take longer to hydrate
          await page.testSubj
            .locator('discoverContextAppTitle')
            .waitFor({ state: 'visible', timeout: 30_000 });
        });

        await spaceTest.step(
          'load saved search in Discover and verifies runtime field column is preserved',
          async () => {
            await discover.goto({ queryMode: 'classic' });
            await discover.loadSavedSearch('logst-ctx-runtimefield');
            await discover.waitUntilTabIsLoaded();

            const columns = await dataGrid.getDataGridHeaderFieldTokens();
            expect(columns.join(' ')).toContain('_bytes-runtimefield');
          }
        );
      }
    );

    spaceTest(
      'shows toast notifications for invalid filter references after data view update',
      async ({ discoverScoutSpace, page, pageObjects }) => {
        const { discover, filterBar, toasts } = pageObjects;
        let prevId: string;

        await spaceTest.step('creates ad hoc data view and adds filters', async () => {
          await discoverScoutSpace.createDiscoverSession({
            title: 'logstas-filter-toast-test',
            tabs: [
              {
                id: 'main',
                label: 'Untitled',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'logstash*',
                  time_field: '@timestamp',
                },
              },
            ],
          });
          await discover.loadSavedSearch('logstas-filter-toast-test');

          await filterBar.addFilter({
            field: 'nestedField.child',
            operator: 'is',
            value: 'nestedValue',
          });
          await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
        });

        await spaceTest.step('adds runtime field and verifies data view id changed', async () => {
          prevId = await discover.getCurrentDataViewId();
          await discover.createRuntimeField({
            fieldName: '_bytes-runtimefield',
            script: `emit((doc["bytes"].value * 2).toString())`,
          });
          const newId = await discover.getCurrentDataViewId();
          expect(newId).not.toBe(prevId);
        });

        await spaceTest.step(
          'navigates back and verifies invalid-filter-ref toast notifications',
          async () => {
            await page.goBack();

            await toasts.waitForToastWithText(`"${prevId}" is not a configured data view ID`);
            await toasts.waitForToastWithText('Different index references');
          }
        );
      }
    );
  }
);
