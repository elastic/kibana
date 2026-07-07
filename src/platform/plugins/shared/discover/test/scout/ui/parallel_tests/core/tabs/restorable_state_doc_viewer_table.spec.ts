/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const DOC_VIEWER_TABLE_TAB_ID = 'doc_view_table';

const openTableDocViewer = async ({ dataGrid, discover }: PageObjects) => {
  await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
  expect(await discover.isShowingDocViewer()).toBe(true);
  await dataGrid.openDocViewerTab(DOC_VIEWER_TABLE_TAB_ID);
  await dataGrid.getDocViewer().waitFor({ state: 'visible' });
};

const getShowOnlySelectedSwitch = (page: ScoutPage) =>
  page.testSubj.locator('unifiedDocViewerShowOnlySelectedFieldsSwitch');

const expectShowOnlySelected = async (page: ScoutPage, checked: boolean) => {
  await expect(getShowOnlySelectedSwitch(page)).toHaveAttribute(
    'aria-checked',
    checked ? 'true' : 'false'
  );
};

spaceTest.describe(
  'Discover tabs - restorable DocViewer table state',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'restores DocViewer field search and pinned fields per tab',
      async ({ pageObjects }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        await openTableDocViewer(pageObjects);
        await discover.findFieldByNameOrValueInDocViewer('geo');
        await expect(discover.getDocViewerFieldNames()).toHaveCount(4);

        await dataGrid.togglePinActionInFlyout('geo.src');
        expect(await dataGrid.isFieldPinnedInFlyout('geo.src')).toBe(true);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await openTableDocViewer(pageObjects);
        await discover.findFieldByNameOrValueInDocViewer('.sr');
        await expect(discover.getDocViewerFieldNames()).toHaveCount(2);

        await dataGrid.togglePinActionInFlyout('geo.src');
        await dataGrid.togglePinActionInFlyout('geo.srcdest');
        expect(await dataGrid.isFieldPinnedInFlyout('geo.src')).toBe(false);
        expect(await dataGrid.isFieldPinnedInFlyout('geo.srcdest')).toBe(true);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.getDocViewer().waitFor({ state: 'visible' });
        expect(await discover.getDocViewerFieldSearchValue()).toBe('geo');
        expect(await discover.getDocViewerFieldNameCount()).toBe(4);
        expect(await dataGrid.isFieldPinnedInFlyout('geo.src')).toBe(true);
      }
    );

    spaceTest(
      'restores DocViewer field type filters and selected-only state per tab',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, unifiedFieldList, unifiedTabs } = pageObjects;

        await openTableDocViewer(pageObjects);
        await discover.openDocViewerFieldTypeFilter();
        await page.testSubj.locator('typeFilter-date').click();
        await expect(page.testSubj.locator('typeFilter-date')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        await discover.closeDocViewerFieldTypeFilter();
        expect(await discover.getDocViewerFieldTypeFilterCount()).toBe('1');

        await unifiedFieldList.clickFieldListItemAdd('utc_time');
        await discover.waitUntilTabIsLoaded();
        await expectShowOnlySelected(page, false);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await openTableDocViewer(pageObjects);
        await discover.openDocViewerFieldTypeFilter();
        await page.testSubj.locator('typeFilter-number').click();
        await expect(page.testSubj.locator('typeFilter-number')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        await discover.closeDocViewerFieldTypeFilter();
        expect(await discover.getDocViewerFieldTypeFilterCount()).toBe('2');

        await unifiedFieldList.clickFieldListItemAdd('utc_time');
        await discover.waitUntilTabIsLoaded();
        await expectShowOnlySelected(page, false);
        await getShowOnlySelectedSwitch(page).click();
        await expectShowOnlySelected(page, true);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.getDocViewer().waitFor({ state: 'visible' });
        expect(await discover.getDocViewerFieldTypeFilterCount()).toBe('1');
        await expectShowOnlySelected(page, false);
      }
    );

    spaceTest(
      'restores DocViewer rows per page and page number per tab',
      async ({ pageObjects }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        await openTableDocViewer(pageObjects);
        await dataGrid.changeRowsPerPageTo(50, 'docViewer');
        expect(await dataGrid.getCurrentRowsPerPage('docViewer')).toBe(50);
        expect(await dataGrid.getCurrentPageNumber('docViewer')).toBe('1');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await openTableDocViewer(pageObjects);
        await dataGrid.changeRowsPerPageTo(25, 'docViewer');
        expect(await dataGrid.getCurrentRowsPerPage('docViewer')).toBe(25);
        await dataGrid.getPageButton(1, 'docViewer').click();
        await expect(dataGrid.getCurrentPageButton('docViewer')).toHaveText('2');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.getDocViewer().waitFor({ state: 'visible' });
        expect(await dataGrid.getCurrentRowsPerPage('docViewer')).toBe(50);
        expect(await dataGrid.getCurrentPageNumber('docViewer')).toBe('1');
      }
    );
  }
);
