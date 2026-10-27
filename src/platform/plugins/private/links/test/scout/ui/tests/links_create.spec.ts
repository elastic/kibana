/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { DASHBOARD_KBN_ARCHIVE } from '../constants';

const LINKS_PANEL_NAME = 'Some links';

test.describe('Links panel - create', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(DASHBOARD_KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.openAddPanelFlyout();
    await pageObjects.linksPanel.openEditorFromAddPanelFlyout();
    await expect(page.testSubj.locator('dashboardPanelSelectionFlyout')).toBeHidden();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('can create a new by-reference links panel', async ({ kbnUrl, page, pageObjects }) => {
    const { dashboard, linksPanel } = pageObjects;

    await linksPanel.addExternalLink({ destination: kbnUrl.get('/app/foo') });
    await linksPanel.addDashboardLink({ destination: 'links 001' });
    await linksPanel.setSaveByReference(true);
    await linksPanel.savePanelEditor();
    await page.testSubj.fill('savedObjectTitle', LINKS_PANEL_NAME);
    await page.testSubj.click('confirmSaveSavedObjectButton');

    await expect(linksPanel.linksComponent).toBeVisible();
    await dashboard.expectLinkedToLibrary(LINKS_PANEL_NAME);
    await expect(linksPanel.getLinksInPanel()).toHaveCount(2);
  });

  test('does not close the flyout when the user cancels the save as modal', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    const { linksPanel } = pageObjects;

    await linksPanel.addExternalLink({ destination: kbnUrl.get('/app/foo') });
    await linksPanel.setSaveByReference(true);
    await linksPanel.savePanelEditor();
    await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
    await page.testSubj.click('saveCancelButton');

    await expect(linksPanel.panelEditorFlyout).toBeVisible();
  });

  test('can create a by-value links panel and move it to and from the library', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    const { dashboard, linksPanel } = pageObjects;

    await test.step('create a by-value links panel', async () => {
      // external links to non-existent Kibana apps are never followed, only stored
      await linksPanel.addExternalLink({ destination: kbnUrl.get('/app/foo') });
      await linksPanel.addDashboardLink({ destination: 'links 001' });
      await linksPanel.setLayout('horizontal');
      await linksPanel.setSaveByReference(false);
      await linksPanel.savePanelEditor();

      await expect(linksPanel.linksComponent).toBeVisible();
      await expect(linksPanel.getLinksInPanel()).toHaveCount(2);
      await dashboard.expectNotLinkedToLibrary();
    });

    await test.step('save the by-value links panel to the library', async () => {
      /** Navigate away to test non-extensible input */
      await page.gotoApp('dashboards');
      await page.testSubj.click('edit-unsaved-New-Dashboard');
      await dashboard.waitForRenderComplete();
      await dashboard.saveToLibrary('Some more links');
    });

    await test.step('unlink the panel from the library', async () => {
      await dashboard.unlinkFromLibrary('Some more links');
    });
  });
});
