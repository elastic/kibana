/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../common/ui/fixtures';

spaceTest.describe(
  'Discover linked session dashboard editing',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'resets to a normal Discover session after leaving a dashboard edit session',
      async ({ page, pageObjects }) => {
        const { dashboard, discover, unifiedTabs } = pageObjects;
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();
        await dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SAVED_SEARCH_TITLE
        );
        await discover.openInlineEditorInDiscover();

        expect(await discover.getCurrentQueryName()).toBe(`Editing ${testData.SAVED_SEARCH_TITLE}`);
        await expect(page.testSubj.locator('unifiedTabs_tabsBar')).toBeVisible();
        await discover.goto({ queryMode: 'classic' });
        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        await expect(page.testSubj.locator('discoverSaveButton')).toHaveText('Save');
      }
    );

    spaceTest(
      'saves a linked session edit and returns to the dashboard',
      async ({ page, pageObjects }) => {
        const { dashboard, dataGrid, discover } = pageObjects;
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();
        await dataGrid.waitForLoad();
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        await dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SAVED_SEARCH_TITLE
        );
        await discover.openInlineEditorInDiscover();

        expect(await discover.getCurrentQueryName()).toBe(`Editing ${testData.SAVED_SEARCH_TITLE}`);
        await expect(page.testSubj.locator('unifiedTabs_tabsBar')).toBeVisible();
        await expect(page.testSubj.locator('discoverSaveButton')).toHaveText('Save and return');
        await discover.saveSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();
        await dataGrid.waitForLoad();

        await expect(
          dashboard.getPanelHoverActionsLocator(testData.SAVED_SEARCH_TITLE)
        ).toBeVisible();
        await dashboard.expectLinkedToLibrary(testData.SAVED_SEARCH_TITLE);
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'opens a normal Discover session when saving a linked edit as new',
      async ({ page, pageObjects, scoutSpace }) => {
        const { dashboard, discover, unifiedTabs } = pageObjects;
        const savedAsTitle = `Saved linked Discover session ${scoutSpace.id}`;
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();
        await dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SAVED_SEARCH_TITLE
        );
        await discover.openInlineEditorInDiscover();

        expect(await discover.getCurrentQueryName()).toBe(`Editing ${testData.SAVED_SEARCH_TITLE}`);
        await expect(page.testSubj.locator('unifiedTabs_tabsBar')).toBeVisible();
        await expect(page.testSubj.locator('discoverSaveButton')).toHaveText('Save and return');
        await discover.saveEditorSessionAsNew(savedAsTitle);

        expect(await discover.getCurrentQueryName()).toBe(savedAsTitle);
        await expect(unifiedTabs.getTabs()).toHaveCount(1);
        await expect(page.testSubj.locator('discoverSaveButton')).toHaveText('Save');
      }
    );
  }
);
