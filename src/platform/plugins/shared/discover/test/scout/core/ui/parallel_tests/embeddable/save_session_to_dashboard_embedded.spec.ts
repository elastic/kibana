/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../../common/ui/fixtures';

const COPIED_SESSION_TITLE = 'Copied Discover session';

spaceTest.describe(
  'Save a Discover session from the embedded editor',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.dashboard.openNewDashboard();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'can save a new session and return to the dashboard',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;

        await dashboard.addNewPanel('Discover session');
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('discoverSaveButton')).toContainText('Save and return');

        await discover.writeAndSubmitKqlQuery('test');
        await discover.saveAndReturnToEditor();
        await dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveCount(1);
        await expect.poll(() => dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'can edit an existing session and save a copy without changing the original',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;

        await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
        await dashboard.waitForRenderComplete();
        const initialRowCount = await dashboard.getSavedSearchRowCount();
        expect(initialRowCount).toBeGreaterThan(0);

        await dashboard.editLinkedDiscoverPanel(testData.SAVED_SEARCH_TITLE);
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitKqlQuery('test');
        await discover.saveSearch(testData.SAVED_SEARCH_TITLE);
        await page.waitForURL(/\/app\/dashboards/);
        await dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect.poll(() => dashboard.getSavedSearchRowCount()).not.toBe(initialRowCount);
        const filteredRowCount = await dashboard.getSavedSearchRowCount();
        expect(filteredRowCount).toBeGreaterThan(0);

        await spaceTest.step(
          'save a copy to a new dashboard without changing the original',
          async () => {
            await dashboard.editLinkedDiscoverPanel(testData.SAVED_SEARCH_TITLE);
            await discover.waitUntilTabIsLoaded();
            await discover.writeAndSubmitKqlQuery('');
            await discover.openSaveSearchAsModal();
            await discover.saveModal.saveToNewDashboard(COPIED_SESSION_TITLE);
            await page.waitForURL(/\/app\/dashboards/);
            await dashboard.waitForRenderComplete();

            await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
            await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveCount(2);
            await expect(dashboard.getPanelTitlesLocator()).toHaveText([
              testData.SAVED_SEARCH_TITLE,
              COPIED_SESSION_TITLE,
            ]);
            await expect
              .poll(() => dashboard.getSavedSearchRowCounts())
              .toStrictEqual(expect.arrayContaining([filteredRowCount, initialRowCount]));
          }
        );
      }
    );
  }
);
