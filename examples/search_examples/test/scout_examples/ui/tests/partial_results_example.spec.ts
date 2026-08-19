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
import { APP_ID, LENS_BASIC_KBN_ARCHIVE, LOGSTASH_FUNCTIONAL_ARCHIVE } from '../fixtures';

test.describe('Partial results example', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
    await kbnClient.importExport.load(LENS_BASIC_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(LENS_BASIC_KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.get(`/app/${APP_ID}/search`));
    // Wait for the app to be fully rendered before any test interacts with it.
    await expect(page.testSubj.locator('requestFibonacci')).toBeVisible();
  });

  test('should update a progress bar', async ({ page }) => {
    await page.testSubj.locator('responseTab').click();
    const progressBar = page.testSubj.locator('progressBar');
    await expect(progressBar).toHaveAttribute('value', '0');

    await page.testSubj.locator('requestFibonacci').click();
    await expect(progressBar).not.toHaveAttribute('value', '0');
  });
});
