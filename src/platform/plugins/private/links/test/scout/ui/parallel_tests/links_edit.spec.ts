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

spaceTest.describe('Links panel - edit', { tag: tags.deploymentAgnostic }, () => {
  let links001Id: string;

  // Each test saves changes to the "links 001" dashboard's panel, so every test gets fresh copies.
  spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_KBN_ARCHIVE);
    links001Id = imported.find(
      ({ type, title }) => type === 'dashboard' && title === 'links 001'
    )!.id;

    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(links001Id);
    await pageObjects.dashboard.clickPanelAction(
      'embeddablePanelAction-editPanel',
      'a few horizontal links'
    );
    await expect(pageObjects.linksPanel.panelEditorFlyout).toBeVisible();
  });

  spaceTest.afterEach(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('can reorder links in an existing panel', async ({ pageObjects }) => {
    const { linksPanel } = pageObjects;
    // strip the screen reader suffix of external links
    const original = (await linksPanel.getLinksInPanel().allInnerTexts()).map((text) =>
      text.replace(/\s*\(external\)$/, '')
    );
    expect(original[2]).toBe('links 003 - external');

    // Move the third link up one step
    await linksPanel.moveLinkUp('links 003 - external', 1);
    await linksPanel.savePanelEditor();
    await expect(linksPanel.panelEditorFlyout).toBeHidden();

    // The second link in the component should be the link we moved
    const [first, second, third, ...rest] = original;
    await expect(linksPanel.getLinksInPanel()).toContainText([first, third, second, ...rest]);
  });

  spaceTest('can edit link in existing panel', async ({ page, pageObjects }) => {
    const { linksPanel } = pageObjects;

    await linksPanel.editLink('links 005');
    await page.testSubj.fill('links--linkEditor--linkLabel--input', 'to be deleted');
    await linksPanel.saveLinkEditor();
    await linksPanel.savePanelEditor();
    await expect(linksPanel.panelEditorFlyout).toBeHidden();

    await expect(page.testSubj.locator('dashboardLink--links 005')).toContainText('to be deleted');
  });

  spaceTest('can delete link from existing panel', async ({ pageObjects }) => {
    const { linksPanel } = pageObjects;
    await expect(linksPanel.getEditorLinks()).toHaveCount(5);

    await linksPanel.deleteLink('links 005');
    await linksPanel.savePanelEditor();
    await expect(linksPanel.panelEditorFlyout).toBeHidden();

    await expect(linksPanel.getLinksInPanel()).toHaveCount(4);
  });
});
