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

const EXISTING_DASHBOARD_TITLE = 'Existing target dashboard';
const SAVED_SESSION_TITLE = 'Session saved from a by-value panel';

spaceTest.describe(
  'Add a new Discover panel from Dashboard',
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
      'can add a new Discover session panel to the dashboard',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;

        await dashboard.addNewPanel('Discover session');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getCurrentQueryName()).toBe('New Discover session');
        await expect(page.testSubj.locator('unifiedTabs_tabsBar')).toBeHidden();
        await expect(page.testSubj.locator('discoverSaveButton')).toContainText('Save and return');

        await discover.writeAndSubmitKqlQuery('test');
        await discover.saveAndReturnToEditor();
        await dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect.poll(() => dashboard.getPanelCount()).toBe(1);
        await expect.poll(() => dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'can save a new session from an existing by-value panel without overriding it',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;

        await dashboard.addNewPanel('Discover session');
        await discover.waitUntilTabIsLoaded();
        await discover.saveAndReturnToEditor();
        await dashboard.waitForRenderComplete();
        const [originalRowCount] = await dashboard.getSavedSearchRowCounts();
        expect(originalRowCount).toBeGreaterThan(0);
        await dashboard.saveDashboard(EXISTING_DASHBOARD_TITLE);
        await dashboard.ensureEditMode();

        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitKqlQuery('test');
        await discover.openSaveSearchAsModal();
        await discover.saveModal.saveToExistingDashboard(
          SAVED_SESSION_TITLE,
          EXISTING_DASHBOARD_TITLE
        );
        await page.waitForURL(/\/app\/dashboards/);
        await dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveCount(2);
        // The original by-value panel remains untitled; only the saved library session has a title.
        await expect(dashboard.getPanelTitlesLocator()).toHaveText([SAVED_SESSION_TITLE]);
        await expect
          .poll(() => dashboard.getSavedSearchRowCounts())
          .toStrictEqual(expect.arrayContaining([originalRowCount]));
        await expect
          .poll(async () => new Set(await dashboard.getSavedSearchRowCounts()).size)
          .toBe(2);
      }
    );

    spaceTest('can cancel adding a new Discover session panel', async ({ page, pageObjects }) => {
      const { dashboard, discover } = pageObjects;

      await dashboard.addNewPanel('Discover session');
      await discover.waitUntilTabIsLoaded();
      await discover.writeAndSubmitKqlQuery('test');
      await discover.cancelEditorChanges();
      await page.waitForURL(/\/app\/dashboards/);

      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
      await expect.poll(() => dashboard.getPanelCount()).toBe(0);
    });
  }
);
