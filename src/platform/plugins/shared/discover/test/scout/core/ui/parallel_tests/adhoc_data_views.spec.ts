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

spaceTest.describe('Discover — adhoc data views', { tag: tags.deploymentAgnostic }, () => {
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
    'adding a runtime field to an ad hoc data view changes the data view ID',
    async ({ discoverScoutSpace, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await discoverScoutSpace.createDiscoverSession({
        title: 'logstash-adhoc',
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
      await discover.loadSavedSearch('logstash-adhoc');
      const firstId = await discover.getCurrentDataViewId();

      await discover.createRuntimeField({
        fieldName: '_bytes-runtimefield',
        script: `emit(doc["bytes"].value.toString())`,
      });
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

      const secondId = await discover.getCurrentDataViewId();
      expect(firstId).not.toBe(secondId);
    }
  );

  spaceTest(
    'navigates to surrounding docs view and back, preserving the ad hoc data view',
    async ({ discoverScoutSpace, page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await discoverScoutSpace.createDiscoverSession({
        title: 'logstash-adhoc-surrounding',
        tabs: [
          {
            id: 'main',
            label: 'Untitled',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'logstash*',
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
      await discover.loadSavedSearch('logstash-adhoc-surrounding');

      await dataGrid.openDocumentDetails({ rowIndex: 0 });
      const actions = await dataGrid.getRowActions();
      // Actions are: [0] View single document, [1] View surrounding documents
      await actions[1].click();

      // context page can take longer to hydrate after navigating from surrounding-docs action
      await page.testSubj
        .locator('discoverContextAppTitle')
        .waitFor({ state: 'visible', timeout: 30_000 });

      await page.testSubj.locator('appHeaderBack').click();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe('logstash*');
    }
  );

  spaceTest(
    'navigates to single doc view and back, preserving the ad hoc data view',
    async ({ discoverScoutSpace, page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await discoverScoutSpace.createDiscoverSession({
        title: 'logstash-adhoc-single-doc',
        tabs: [
          {
            id: 'main',
            label: 'Untitled',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'logstash*',
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
      await discover.loadSavedSearch('logstash-adhoc-single-doc');

      await dataGrid.openDocumentDetails({ rowIndex: 0 });
      const actions = await dataGrid.getRowActions();
      // Actions are: [0] View single document, [1] View surrounding documents
      await actions[0].click();

      // single-doc page can take longer to hydrate after navigating from the row action
      await page.testSubj
        .locator('discoverSingleDocTitle')
        .waitFor({ state: 'visible', timeout: 30_000 });

      await page.testSubj.locator('appHeaderBack').click();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe('logstash*');
    }
  );

  spaceTest(
    'saving preserves the data view ID but saving as copy generates a new data view ID',
    async ({ discoverScoutSpace, pageObjects }) => {
      const { discover } = pageObjects;

      await discoverScoutSpace.createDiscoverSession({
        title: 'logstash-adhoc-save',
        tabs: [
          {
            id: 'main',
            label: 'Untitled',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'logstash*',
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
      await discover.loadSavedSearch('logstash-adhoc-save');

      const idBeforeSave = await discover.getCurrentDataViewId();
      await discover.saveSearch('logstash*-ss');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getCurrentDataViewId()).toBe(idBeforeSave);

      const idBeforeCopy = await discover.getCurrentDataViewId();
      await discover.saveSearchAsNew('logstash*-ss-new');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getCurrentDataViewId()).not.toBe(idBeforeCopy);
    }
  );

  spaceTest(
    'search results differ between original and updated runtime field definitions on dashboard',
    async ({ discoverScoutSpace, pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid, dashboard } = pageObjects;

      await spaceTest.step(
        'creates ad hoc data view with runtime field and saves search',
        async () => {
          await discoverScoutSpace.createDiscoverSession({
            title: 'logst*-ss-_bytes-runtimefield',
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
          await discover.loadSavedSearch('logst*-ss-_bytes-runtimefield');
          await discover.waitUntilTabIsLoaded();
        }
      );

      await spaceTest.step(
        'recreates runtime field with 2× multiplier and saves as new search',
        async () => {
          await unifiedFieldList.clickFieldListItemRemove('_bytes-runtimefield');
          await discover.deleteRuntimeField('_bytes-runtimefield');
          await unifiedFieldList.waitUntilSidebarHasLoaded();

          await discover.createRuntimeField({
            fieldName: '_bytes-runtimefield',
            script: `emit((doc["bytes"].value * 2).toString())`,
          });
          await discover.waitUntilTabIsLoaded();
          await unifiedFieldList.waitUntilSidebarHasLoaded();
          await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

          await discover.saveSearchAsNew('logst*-ss-_bytes-runtimefield-updated');
          await discover.waitUntilTabIsLoaded();
        }
      );

      await spaceTest.step(
        'adds both saved searches to a dashboard and compares cell values',
        async () => {
          await dashboard.goto();
          await dashboard.openNewDashboard();

          await dashboard.addSavedSearch('logst*-ss-_bytes-runtimefield');
          await dashboard.addSavedSearch('logst*-ss-_bytes-runtimefield-updated');

          const cellLocator = dataGrid.getCellsAtVisibleRowIndex('_bytes-runtimefield', 0);
          await expect(cellLocator).toHaveCount(2);
          const cells = await cellLocator.all();
          const first = parseFloat((await cells[0].innerText()).replace(/,/g, ''));
          const second = parseFloat((await cells[1].innerText()).replace(/,/g, ''));
          expect(second).toBe(first * 2);
        }
      );
    }
  );

  spaceTest(
    'editing a runtime field via the column menu changes the data view ID',
    async ({ discoverScoutSpace, page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await discoverScoutSpace.createDiscoverSession({
        title: 'logst-runtimefield-edit',
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
      await discover.loadSavedSearch('logst-runtimefield-edit');
      await discover.waitUntilTabIsLoaded();

      const prevId = await discover.getCurrentDataViewId();

      await dataGrid.openColumnMenuByField('_bytes-runtimefield');
      await page.testSubj.click('gridEditFieldButton');

      await page
        .getByRole('dialog', { name: /Edit .* field/ })
        .getByRole('textbox', { name: 'Name field' })
        .fill('_bytes-runtimefield-edited');
      await discover.saveOpenFieldEditor({ confirmChange: true });

      const newId = await discover.getCurrentDataViewId();
      expect(newId).not.toBe(prevId);
    }
  );
});
