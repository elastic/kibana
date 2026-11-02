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
  'Discover by-value session dashboard editing',
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
      'discards edits when cancelling a by-value panel edit',
      async ({ page, pageObjects }) => {
        const { dashboard, dataGrid, discover, queryBar } = pageObjects;
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();
        await dataGrid.waitForLoad();
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

        await dashboard.unlinkFromLibrary(testData.SAVED_SEARCH_TITLE);
        await dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SAVED_SEARCH_TITLE
        );
        await discover.waitUntilTabIsLoaded();
        await queryBar.setQuery('test');
        await discover.submitQuery();
        await expect.poll(() => queryBar.getQuery()).toBe('test');

        await discover.cancelEditorChanges();
        await dashboard.waitForRenderComplete();
        await dataGrid.waitForLoad();
        await expect(
          dashboard.getPanelHoverActionsLocator(testData.SAVED_SEARCH_TITLE)
        ).toBeVisible();
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'keeps the library session unchanged when editing a by-value panel',
      async ({ page, pageObjects }) => {
        const { dashboard, discover, queryBar } = pageObjects;
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();

        await dashboard.unlinkFromLibrary(testData.SAVED_SEARCH_TITLE);
        await dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SAVED_SEARCH_TITLE
        );
        await discover.waitUntilTabIsLoaded();
        await queryBar.setQuery('test');
        await discover.submitQuery();
        await expect.poll(() => queryBar.getQuery()).toBe('test');

        await discover.saveAndReturnToEditor();
        await dashboard.waitForRenderComplete();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForPanelsToLoad(2);
        await dashboard.waitForRenderComplete();

        const panelHitCounts = page.testSubj.locator('savedSearchTotalDocuments');
        await expect(panelHitCounts).toHaveCount(2);
        await expect.poll(async () => new Set(await panelHitCounts.allInnerTexts()).size).toBe(2);
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
      }
    );

    spaceTest(
      'opens a normal Discover session when saving a by-value edit as new',
      async ({ page, pageObjects, scoutSpace }) => {
        const { dashboard, discover, unifiedTabs } = pageObjects;
        const savedAsTitle = `Saved by-value Discover session ${scoutSpace.id}`;
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();

        await dashboard.unlinkFromLibrary(testData.SAVED_SEARCH_TITLE);
        await dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SAVED_SEARCH_TITLE
        );
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('unifiedTabs_tabsBar')).toBeHidden();
        await discover.saveEditorSessionAsNew(savedAsTitle);

        expect(await discover.getCurrentQueryName()).toBe(savedAsTitle);
        await expect(unifiedTabs.getTabs()).toHaveCount(1);
        await expect(page.testSubj.locator('discoverSaveButton')).toHaveText('Save');
      }
    );
  }
);
