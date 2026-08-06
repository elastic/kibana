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
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await discover.createDataViewFromSearchBar({ name: 'logstash', adHoc: true });
      await discover.waitUntilSearchingHasFinished();
      const firstId = await discover.getCurrentDataViewId();

      await discover.createRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

      const secondId = await discover.getCurrentDataViewId();
      expect(firstId).not.toBe(secondId);
    }
  );

  spaceTest(
    'navigates to surrounding docs view and back, preserving the ad hoc data view',
    async ({ page, pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid } = pageObjects;

      await discover.createDataViewFromSearchBar({ name: 'logstash', adHoc: true });
      await discover.waitUntilSearchingHasFinished();
      await discover.createRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

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
    async ({ page, pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid } = pageObjects;

      await discover.createDataViewFromSearchBar({ name: 'logstash', adHoc: true });
      await discover.waitUntilSearchingHasFinished();
      await discover.createRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

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
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await discover.createDataViewFromSearchBar({ name: 'logstash', adHoc: true });
      await discover.waitUntilSearchingHasFinished();
      await discover.createRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

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
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid, dashboard } = pageObjects;

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

      await discover.saveSearch('logst*-ss-_bytes-runtimefield');
      await discover.waitUntilTabIsLoaded();

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
    }
  );

  spaceTest(
    'editing a runtime field via the column menu changes the data view ID',
    async ({ page, pageObjects }) => {
      const { discover, unifiedFieldList, dataGrid } = pageObjects;

      await discover.createDataViewFromSearchBar({ name: 'logst', adHoc: true });
      await discover.waitUntilSearchingHasFinished();

      await discover.createRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

      await discover.saveSearch('logst*-ss-_bytes-runtimefield-edit');
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
