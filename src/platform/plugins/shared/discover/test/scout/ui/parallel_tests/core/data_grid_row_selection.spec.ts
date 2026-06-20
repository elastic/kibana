/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../fixtures/common';

const PAGE_SIZE = 5;

spaceTest.describe('Discover data grid row selection', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'discover:sampleRowsPerPage': PAGE_SIZE });
  });

  spaceTest.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'discover:sampleRowsPerPage'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('allows selecting and deselecting rows manually', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    expect(await discover.isSelectedRowsMenuVisible()).toBe(false);

    await discover.selectRow(1);

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(1);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(1);

    await discover.selectRow(2);

    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(2);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(2);

    await discover.selectRow(2);

    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(1);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(1);
  });

  spaceTest('allows selecting multiple rows with the Shift key', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    expect(await discover.isSelectedRowsMenuVisible()).toBe(false);

    await spaceTest.step('select a range on the first page', async () => {
      await discover.selectRow(1);

      await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(1);
      await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(1);

      await discover.selectRow(4, { pressShiftKey: true });

      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(4);
      await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(4);
    });

    await spaceTest.step('deselect part of the range', async () => {
      await discover.selectRow(3, { pressShiftKey: true });

      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(2);
      await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(2);
    });

    await spaceTest.step('select a reverse range', async () => {
      await discover.selectRow(0, { pressShiftKey: true });

      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(4);
      await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(4);
    });

    await spaceTest.step('extend the selection across pages', async () => {
      await page.testSubj.click('pagination-button-1');
      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(0);

      await discover.selectRow(2, { pressShiftKey: true });

      await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(3);
      await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(8);
    });
  });

  spaceTest('allows selecting and clearing rows in bulk', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    expect(await discover.isSelectedRowsMenuVisible()).toBe(false);
    expect(await discover.getSelectAllRowsOnCurrentPageTitle()).toBe('Select all visible rows');

    await discover.selectRow(1);

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(1);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(1);
    await expect
      .poll(() => discover.getSelectAllRowsOnCurrentPageTitle())
      .toBe('Deselect all visible rows');

    await discover.toggleSelectAllRowsOnCurrentPage();

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(false);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(0);
    await expect
      .poll(() => discover.getSelectAllRowsOnCurrentPageTitle())
      .toBe('Select all visible rows');

    await discover.toggleSelectAllRowsOnCurrentPage();

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(PAGE_SIZE);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(PAGE_SIZE);
    await expect
      .poll(() => discover.getSelectAllRowsOnCurrentPageTitle())
      .toBe('Deselect all visible rows');
    await expect.poll(() => discover.getSelectAllRowsText()).toBe('Select all 500');

    await discover.selectAllRows();

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(PAGE_SIZE);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(500);
    await expect.poll(() => discover.getSelectAllRowsText()).toBeNull();

    await discover.toggleSelectAllRowsOnCurrentPage();

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(0);
    await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(500 - PAGE_SIZE);
    await expect
      .poll(() => discover.getSelectAllRowsOnCurrentPageTitle())
      .toBe('Select all visible rows');
    await expect.poll(() => discover.getSelectAllRowsText()).toBe('Select all 500');

    await discover.openSelectedRowsMenu();
    await page.testSubj.click('dscGridClearSelectedDocuments');

    await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(false);
    await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(0);
    await expect
      .poll(() => discover.getSelectAllRowsOnCurrentPageTitle())
      .toBe('Select all visible rows');
    await expect.poll(() => discover.getSelectAllRowsText()).toBeNull();
  });
});
