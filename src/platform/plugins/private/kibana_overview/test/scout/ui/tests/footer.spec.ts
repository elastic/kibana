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

test.describe('Kibana Overview - Footer', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE);
    await kbnClient.importExport.load(KBN_ARCHIVE);
    await uiSettings.set({ defaultRoute: '/app/home' });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVE);
    await uiSettings.unset('defaultRoute');
  });

  test('clicking footer updates landing page', async ({ browserAuth, page }) => {
    await browserAuth.loginAs('editor');
    await page.gotoApp('kibana_overview');

    const footerButton = page.testSubj.locator('kbnOverviewPageFooterButton');
    await expect(footerButton).toBeVisible();
    await expect(footerButton).toContainText('Make this my landing page');

    await footerButton.click();

    await expect(footerButton).toContainText('Display a different page on log in');
  });
});
