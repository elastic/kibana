/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ES_ARCHIVE, KBN_ARCHIVE } from '../constants';

test.describe('Kibana Overview - Analytics Apps', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVE);
  });

  test('displays analytics app cards', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');

    const appCards = page.locator('[data-test-subj^="kbnOverviewAppCard-"]');
    await expect(appCards).not.toHaveCount(0);
  });

  test('click on a card navigates to the appropriate app', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');

    const dashboardCard = page.testSubj.locator('kbnOverviewAppCard-dashboards');
    await expect(dashboardCard).toBeVisible();
    await dashboardCard.click();
    await expect(page).toHaveURL(/app\/dashboards/);
  });
});
