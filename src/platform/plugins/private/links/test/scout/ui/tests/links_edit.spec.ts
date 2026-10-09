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
import { DASHBOARD_IDS, DASHBOARD_KBN_ARCHIVE } from '../constants';

test.describe('Links panel - edit', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(DASHBOARD_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(DASHBOARD_IDS.LINKS_001);
  });

  test('can reorder, edit and delete links in an existing panel', async ({ page, pageObjects }) => {
    const { dashboard, linksPanel } = pageObjects;

    const openPanelEditor = async () => {
      await dashboard.clickPanelAction('embeddablePanelAction-editPanel', 'a few horizontal links');
      await expect(linksPanel.panelEditorFlyout).toBeVisible();
    };

    await test.step('reorder links', async () => {
      // strip the screen reader suffix of external links
      const original = (await linksPanel.getLinksInPanel().allInnerTexts()).map((text) =>
        text.replace(/\s*\(external\)$/, '')
      );
      expect(original[2]).toBe('links 003 - external');

      await openPanelEditor();
      // Move the third link up one step
      await linksPanel.moveLinkUp('links 003 - external', 1);
      await linksPanel.savePanelEditor();
      await expect(linksPanel.panelEditorFlyout).toBeHidden();

      // The second link in the component should be the link we moved
      const [first, second, third, ...rest] = original;
      await expect(linksPanel.getLinksInPanel()).toContainText([first, third, second, ...rest]);
    });

    await test.step('edit a link', async () => {
      await openPanelEditor();
      await linksPanel.editLink('links 005');
      await page.testSubj.fill('links--linkEditor--linkLabel--input', 'renamed link');
      await linksPanel.saveLinkEditor();
      await linksPanel.savePanelEditor();
      await expect(linksPanel.panelEditorFlyout).toBeHidden();

      await expect(page.testSubj.locator('dashboardLink--links 005')).toContainText('renamed link');
    });

    await test.step('delete a link', async () => {
      await openPanelEditor();
      await expect(linksPanel.getEditorLinks()).toHaveCount(5);
      await linksPanel.deleteLink('links 001 - filters');
      await linksPanel.savePanelEditor();
      await expect(linksPanel.panelEditorFlyout).toBeHidden();

      await expect(linksPanel.getLinksInPanel()).toHaveCount(4);
      await expect(page.testSubj.locator('dashboardLink--links 001')).toBeHidden();
    });
  });
});
