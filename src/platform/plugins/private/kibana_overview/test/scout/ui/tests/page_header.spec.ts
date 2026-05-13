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

test.describe('Kibana Overview - Page Header', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVE);
  });

  test('click on integrations leads to integrations', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');
    await page.testSubj.click('homeAddData');
    await expect(page).toHaveURL(/app\/integrations\/browse/);
  });

  test('click on management leads to management', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');
    await page.testSubj.click('homeManage');
    await expect(page).toHaveURL(/app\/management/);
  });

  test('click on dev tools leads to dev tools', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');
    await page.testSubj.click('homeDevTools');
    await expect(page).toHaveURL(/app\/dev_tools/);
  });
});
