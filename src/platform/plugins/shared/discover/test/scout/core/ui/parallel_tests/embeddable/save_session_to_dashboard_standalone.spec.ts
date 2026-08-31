/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../../common/ui/fixtures';

const EXISTING_DASHBOARD_TITLE = 'Existing target dashboard for standalone session';
const LIBRARY_ONLY_SESSION_TITLE = 'Library only session';
const NEW_DASHBOARD_SESSION_TITLE = 'Session for new dashboard';
const ORIGINAL_SESSION_TITLE = 'Original session for save as';
const SAVED_AS_NEW_SESSION_TITLE = 'Session saved without overriding the original';

spaceTest.describe(
  'Save a standalone Discover session to Dashboard',
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

    spaceTest('can save a new session only to the library', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.writeAndSubmitKqlQuery('test');
      await discover.openSaveSearchModal();
      await expect(page.testSubj.locator('add-to-dashboard-options')).toBeVisible();
      await discover.saveModal.fillTitle(LIBRARY_ONLY_SESSION_TITLE);
      await discover.saveModal.selectNoDashboard();
      await discover.saveModal.confirm();

      expect(await discover.getCurrentQueryName()).toBe(LIBRARY_ONLY_SESSION_TITLE);
      await expect(page).toHaveURL(/\/app\/discover/);
      await expect(page.testSubj.locator('dshDashboardViewport')).toBeHidden();
    });

    spaceTest('can save a new session to a new dashboard', async ({ page, pageObjects }) => {
      const { dashboard, discover } = pageObjects;

      await discover.writeAndSubmitKqlQuery('test');
      await discover.openSaveSearchModal();
      await discover.saveModal.saveToNewDashboard(NEW_DASHBOARD_SESSION_TITLE);
      await page.waitForURL(/\/app\/dashboards/);
      await dashboard.waitForRenderComplete();

      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
      await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveCount(1);
      await expect.poll(() => dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);
      await dashboard.saveDashboard('New dashboard with session');
    });

    spaceTest(
      'can save a new session from an existing one without overriding the original',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;

        await discover.saveSearch(ORIGINAL_SESSION_TITLE);
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(ORIGINAL_SESSION_TITLE);
        await dashboard.waitForRenderComplete();
        const [originalRowCount] = await dashboard.getSavedSearchRowCounts();
        expect(originalRowCount).toBeGreaterThan(0);
        await dashboard.saveDashboard(EXISTING_DASHBOARD_TITLE);
        await dashboard.ensureEditMode();

        await dashboard.editLinkedDiscoverPanel(ORIGINAL_SESSION_TITLE);
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitKqlQuery('test');
        await discover.openSaveSearchAsModal();
        await discover.saveModal.saveToExistingDashboard(
          SAVED_AS_NEW_SESSION_TITLE,
          EXISTING_DASHBOARD_TITLE
        );
        await page.waitForURL(/\/app\/dashboards/);
        await dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveCount(2);
        await expect(dashboard.getPanelTitlesLocator()).toHaveText([
          ORIGINAL_SESSION_TITLE,
          SAVED_AS_NEW_SESSION_TITLE,
        ]);
        await expect
          .poll(() => dashboard.getSavedSearchRowCounts())
          .toStrictEqual(expect.arrayContaining([originalRowCount]));
        await expect
          .poll(async () => new Set(await dashboard.getSavedSearchRowCounts()).size)
          .toBe(2);
      }
    );
  }
);
