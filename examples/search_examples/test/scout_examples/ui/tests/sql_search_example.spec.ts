/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { APP_ID, LENS_BASIC_KBN_ARCHIVE, LOGSTASH_FUNCTIONAL_ARCHIVE } from '../fixtures';

test.describe('SQL search example', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
    await kbnClient.importExport.load(LENS_BASIC_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(LENS_BASIC_KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.get(`/app/${APP_ID}/sql-search`));
    // Wait for the app to be fully rendered before any test interacts with it.
    await expect(page.testSubj.locator('sqlQueryInput')).toBeVisible();
  });

  test('should search', async ({ page }) => {
    const sqlQuery = `SELECT index, bytes FROM "logstash-*" ORDER BY "@timestamp" DESC`;
    await page.testSubj.locator('sqlQueryInput').fill(sqlQuery);
    await page.testSubj.locator('querySubmitButton').click();

    await expect(page.testSubj.locator('requestCodeBlock')).toContainText(JSON.stringify(sqlQuery));
    await expect(page.testSubj.locator('responseCodeBlock')).toContainText('"logstash-2015.09.22"');
    await expect(page.components.toast().toasts).toHaveCount(0);
  });
});
