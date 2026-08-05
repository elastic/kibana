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

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'navigates back from context/single-doc views and saves ad hoc search',
    async ({ browserAuth, page, pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();

      let firstDataViewId: string;

      await spaceTest.step('creates ad hoc data view and adds runtime field', async () => {
        await discover.createDataViewFromSearchBar({ name: 'logstash', adHoc: true });
        await discover.waitUntilSearchingHasFinished();
        firstDataViewId = await discover.getCurrentDataViewId();

        await discover.createRuntimeField(
          '_bytes-runtimefield',
          `emit(doc["bytes"].value.toString())`
        );
        await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

        const secondId = await discover.getCurrentDataViewId();
        expect(firstDataViewId).not.toBe(secondId);
      });

      await spaceTest.step('navigates to surrounding docs view and back', async () => {
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
      });

      await spaceTest.step('navigates to single doc view and back', async () => {
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
      });

      let prevSaveId: string;

      await spaceTest.step('saves search and data view ID is unchanged', async () => {
        prevSaveId = await discover.getCurrentDataViewId();
        await discover.saveSearch('logstash*-ss');
        await discover.waitUntilTabIsLoaded();

        const newId = await discover.getCurrentDataViewId();
        expect(prevSaveId).toBe(newId);
      });

      await spaceTest.step('saves search as copy and data view ID changes', async () => {
        const prevId = await discover.getCurrentDataViewId();
        await discover.saveSearchAsNew('logstash*-ss-new');
        await discover.waitUntilTabIsLoaded();

        const newId = await discover.getCurrentDataViewId();
        expect(prevId).not.toBe(newId);
      });
    }
  );

  spaceTest(
    'search results differ after data view update and id updates after field edit',
    async ({ browserAuth, page, pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid, dashboard } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();

      await spaceTest.step('creates ad hoc data view with runtime field', async () => {
        await discover.createDataViewFromSearchBar({ name: 'logst', adHoc: true });
        await discover.waitUntilSearchingHasFinished();
        const prevId = await discover.getCurrentDataViewId();

        await discover.createRuntimeField(
          '_bytes-runtimefield',
          `emit(doc["bytes"].value.toString())`
        );
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

        const newId = await discover.getCurrentDataViewId();
        expect(newId).not.toBe(prevId);
      });

      await spaceTest.step('saves first search', async () => {
        await discover.saveSearch('logst*-ss-_bytes-runtimefield');
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('removes and recreates runtime field with doubled value', async () => {
        await unifiedFieldList.clickFieldListItemRemove('_bytes-runtimefield');
        await discover.deleteRuntimeField('_bytes-runtimefield');
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await discover.createRuntimeField(
          '_bytes-runtimefield',
          `emit((doc["bytes"].value * 2).toString())`
        );
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');
      });

      await spaceTest.step('saves second search and compares values on dashboard', async () => {
        await discover.saveSearchAsNew('logst*-ss-_bytes-runtimefield-updated');
        await discover.waitUntilTabIsLoaded();

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
      });

      await spaceTest.step(
        'loads saved search and verifies id changes after field rename',
        async () => {
          await discover.goto({ queryMode: 'classic' });
          await discover.loadSavedSearch('logst*-ss-_bytes-runtimefield');
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
    }
  );
});
