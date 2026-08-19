/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke coverage of the search_examples demo (with and without bfetch on stateful).
 * Serverless runs the default (bfetch-disabled) path only; warning toast is skipped
 * there because `error_query` is unsupported.
 */

import { test, tags, type ScoutPage, type PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  APP_ID,
  DATA_VIEW,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_FUNCTIONAL_ARCHIVE,
  LOGSTASH_TIME_RANGE,
} from '../fixtures';

async function configureSearchDemo(page: ScoutPage, pageObjects: PageObjects): Promise<void> {
  await page.components.comboBox('dataViewSelector').setSelectedOptions([DATA_VIEW]);
  // Field options load after the data view resolves.
  await expect(page.testSubj.locator('searchBucketField')).toBeVisible();
  await page.components.comboBox('searchBucketField').setSelectedOptions(['geo.src'], {
    timeout: 10_000,
  });
  await page.components.comboBox('searchMetricField').setSelectedOptions(['memory'], {
    timeout: 10_000,
  });
  await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
}

async function assertOtherBucketResponse(
  page: ScoutPage,
  { expectOtherBucket }: { expectOtherBucket: boolean }
): Promise<void> {
  await page.testSubj.locator('responseTab').click();
  const codeBlock = page.testSubj.locator('responseCodeBlock');

  // Locator assertions auto-retry until the Response tab reflects the latest search.
  if (expectOtherBucket) {
    await expect(codeBlock).toContainText('__other__');
    await expect(codeBlock).toContainText('9039');
  } else {
    await expect(codeBlock).toContainText('"buckets"');
    await expect(codeBlock).not.toContainText('__other__');
  }

  const buckets = JSON.parse(await codeBlock.innerText()).aggregations[1].buckets as Array<{
    key: string;
    doc_count: number;
  }>;
  expect(buckets).toHaveLength(expectOtherBucket ? 3 : 2);
  if (expectOtherBucket) {
    expect(buckets[2].key).toBe('__other__');
    expect(buckets[2].doc_count).toBe(9039);
  }
}

test.describe('Search example', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
    await kbnClient.importExport.load(LENS_BASIC_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(LENS_BASIC_KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects, kbnUrl }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.get(`/app/${APP_ID}/search`));
    // Wait for the app to be fully rendered before any test interacts with it.
    await expect(page.testSubj.locator('dataViewSelector')).toBeVisible();
    await configureSearchDemo(page, pageObjects);
    await page.components.toast().closeAll();
  });

  test('should have an other bucket', async ({ page }) => {
    await page.testSubj.locator('searchSourceWithOther').click();
    await assertOtherBucketResponse(page, { expectOtherBucket: true });
  });

  test('should not have an other bucket', async ({ page }) => {
    await page.testSubj.locator('searchSourceWithoutOther').click();
    await assertOtherBucketResponse(page, { expectOtherBucket: false });
  });

  test('should handle warnings', async ({ page, config, pageObjects }) => {
    // Serverless does not support the `error_query` path this button exercises.
    test.skip(!!config.serverless, 'error_query warnings are unsupported in serverless');

    await page.testSubj.locator('searchWithWarning').click();
    await pageObjects.toasts.waitForToastWithText('Watch out!');
  });
});

/**
 * Stateful-only: serverless already forces bfetch off via uiSettings.overrides.
 * Top-level describe (not nested): parent tags are inherited, so nesting under
 * deploymentAgnostic would still schedule this on serverless.
 */
test.describe('Search example with bfetch disabled', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
    await kbnClient.importExport.load(LENS_BASIC_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(LENS_BASIC_KBN_ARCHIVE);
  });

  test('should have an other bucket with bfetch disabled', async ({
    browserAuth,
    page,
    pageObjects,
    kbnClient,
    kbnUrl,
  }) => {
    await kbnClient.uiSettings.update({ 'bfetch:disable': true });
    try {
      await browserAuth.loginAsPrivilegedUser();
      await page.goto(kbnUrl.get(`/app/${APP_ID}/search`));
      await expect(page.testSubj.locator('dataViewSelector')).toBeVisible();
      await configureSearchDemo(page, pageObjects);
      await page.components.toast().closeAll();

      await page.testSubj.locator('searchSourceWithOther').click();
      await assertOtherBucketResponse(page, { expectOtherBucket: true });

      await page.testSubj.locator('searchSourceWithoutOther').click();
      await assertOtherBucketResponse(page, { expectOtherBucket: false });

      await page.testSubj.locator('searchWithWarning').click();
      await pageObjects.toasts.waitForToastWithText('Watch out!');
    } finally {
      await kbnClient.uiSettings.unset('bfetch:disable');
    }
  });
});
