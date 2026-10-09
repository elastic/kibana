/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { DASHBOARD_KBN_ARCHIVE } from '../constants';

const LINKS_PANEL_NAME = 'Some links';

spaceTest.describe('Links panel - create', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(DASHBOARD_KBN_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth, kbnUrl, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.openAddPanelFlyout();
    await pageObjects.linksPanel.openEditorFromAddPanelFlyout();
    await expect(page.testSubj.locator('dashboardPanelSelectionFlyout')).toBeHidden();
    // external links to non-existent Kibana apps are never followed, only stored
    await pageObjects.linksPanel.addExternalLink({
      destination: kbnUrl.get('/app/foo'),
      label: 'Link to new tab',
    });
    await pageObjects.linksPanel.addExternalLink({
      destination: kbnUrl.get('/app/bar'),
      openInNewTab: false,
    });
    await pageObjects.linksPanel.addDashboardLink({ destination: 'links 001' });
    await pageObjects.linksPanel.addDashboardLink({ destination: 'links 002' });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('can create a new by-reference links panel', async ({ page, pageObjects }) => {
    const { dashboard, linksPanel } = pageObjects;

    await linksPanel.setSaveByReference(true);
    await linksPanel.savePanelEditor();
    await page.testSubj.fill('savedObjectTitle', LINKS_PANEL_NAME);
    await page.testSubj.click('confirmSaveSavedObjectButton');

    await expect(linksPanel.linksComponent).toBeVisible();
    await dashboard.expectLinkedToLibrary(LINKS_PANEL_NAME);
    await expect(linksPanel.getLinksInPanel()).toHaveCount(4);
  });

  spaceTest(
    'does not close the flyout when the user cancels the save as modal',
    async ({ page, pageObjects }) => {
      const { linksPanel } = pageObjects;

      await linksPanel.setSaveByReference(true);
      await linksPanel.savePanelEditor();
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.click('saveCancelButton');

      await expect(linksPanel.panelEditorFlyout).toBeVisible();
    }
  );

  spaceTest(
    'can create a by-value links panel and move it to and from the library',
    async ({ page, pageObjects }) => {
      const { dashboard, linksPanel } = pageObjects;

      await spaceTest.step('create a by-value links panel', async () => {
        await linksPanel.setLayout('horizontal');
        await linksPanel.setSaveByReference(false);
        await linksPanel.savePanelEditor();

        await expect(linksPanel.linksComponent).toBeVisible();
        await expect(linksPanel.getLinksInPanel()).toHaveCount(4);
        await dashboard.expectNotLinkedToLibrary();
      });

      await spaceTest.step('save the by-value links panel to the library', async () => {
        /** Navigate away to test non-extensible input */
        await page.gotoApp('dashboards');
        await page.testSubj.click('edit-unsaved-New-Dashboard');
        await dashboard.waitForRenderComplete();
        await dashboard.saveToLibrary('Some more links');
      });

      await spaceTest.step('unlink the panel from the library', async () => {
        await dashboard.unlinkFromLibrary('Some more links');
      });
    }
  );
});
