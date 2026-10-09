/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// FTR source: src/platform/test/functional/apps/dashboard_elements/image_embeddable/image_embeddable.ts

import path from 'path';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KIBANA_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';
const DEFAULT_INDEX_ID = '0bf35f60-3dc9-11e8-8660-4d65aa086b3c';
const ELASTIC_LOGO_PATH = path.join(__dirname, '../fixtures/elastic_logo.png');

test.describe('Image embeddable', { tag: '@local-stateful-classic' }, () => {
  let prevDefaultIndex: string | number | boolean | undefined;

  test.beforeAll(async ({ kbnClient, uiSettings }) => {
    prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
    await kbnClient.importExport.load(KIBANA_ARCHIVE);
    await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await kbnClient.savedObjects.cleanStandardList();
    if (prevDefaultIndex !== undefined) {
      await uiSettings.set({ defaultIndex: prevDefaultIndex });
    } else {
      await uiSettings.unset('defaultIndex');
    }
  });

  test('image embeddable smoke test', async ({ browserAuth, pageObjects, page }) => {
    await test.step('login and create a new dashboard with an image panel', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.openAddPanelFlyout();
      await page.testSubj.click('create-action-Image');
      await expect(page.testSubj.locator('createImageEmbeddableFlyout')).toBeVisible();
      await page.locator('.euiFilePicker__input').setInputFiles(ELASTIC_LOGO_PATH);
      await expect(page.testSubj.locator('imageEmbeddableEditorSave')).toBeEnabled({ timeout: 15_000 });
      await page.testSubj.click('imageEmbeddableEditorSave');
      await expect.poll(() => pageObjects.dashboard.getPanelCount()).toBe(1);
      await pageObjects.dashboard.waitForRenderComplete();

      await expect
        .poll(() => page.locator('img.euiImage').getAttribute('src'))
        .toContain('files/defaultImage');
    });

    await test.step('create a dashboard-to-dashboard drilldown', async () => {
      await pageObjects.dashboard.expectExistsPanelAction(
        'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN'
      );
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN'
      );
      await expect(page.testSubj.locator('createDrilldownFlyout')).toBeVisible();
      await page.testSubj.click('drilldownFactoryItem-dashboard_drilldown');
      await page.testSubj.locator('drilldownNameInput').fill('My drilldown');
      await page.components
        .comboBox('dashboardDrilldownSelectDashboard')
        .setSelectedOptions(['few panels'], { timeout: 10_000 });
      await page.testSubj.click('drilldownWizardSubmit');
    });

    await test.step('verify drilldown count and navigate via image click', async () => {
      await pageObjects.dashboard.openPanelContextMenu();
      await expect(
        page.testSubj
          .locator('embeddablePanelAction-OPEN_FLYOUT_EDIT_DRILLDOWN')
          .locator('.euiNotificationBadge')
      ).toHaveText('1');
      await page.keyboard.press('Escape');

      const oldDashboardId = await pageObjects.dashboard.getDashboardIdFromCurrentUrl();
      await page.locator('img.euiImage').click();
      await expect
        .poll(() => pageObjects.dashboard.getDashboardIdFromCurrentUrl(), { timeout: 10_000 })
        .not.toBe(oldDashboardId);
      await pageObjects.dashboard.waitForRenderComplete();
    });
  });
});
