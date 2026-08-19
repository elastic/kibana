/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke test that the search_examples search-sessions demo still wires
 * start/save/restore against the real session APIs. Requires SNAPSHOT ES for
 * the shard_delay aggregation.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  APP_ID,
  DATA_VIEW,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_FUNCTIONAL_ARCHIVE,
  LOGSTASH_TIME_RANGE,
  deleteAllSearchSessions,
  saveBackgroundSearch,
} from '../fixtures';

test.describe('Search session example', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, isSnapshotBuild }) => {
    test.skip(!isSnapshotBuild, 'Requires shard_delay agg (SNAPSHOT builds only)');
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
    await kbnClient.importExport.load(LENS_BASIC_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient, isSnapshotBuild }) => {
    if (!isSnapshotBuild) {
      return;
    }
    await deleteAllSearchSessions(kbnClient);
    await kbnClient.importExport.unload(LENS_BASIC_KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects, kbnUrl }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.get(`/app/${APP_ID}/search-sessions`));
    // Wait for the app to be fully rendered before any test interacts with it.
    await expect(page.testSubj.locator('dataViewSelector')).toBeVisible();
    await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
  });

  test.afterEach(async ({ kbnClient }) => {
    await deleteAllSearchSessions(kbnClient);
  });

  test('should start search, save session, restore session using restore button', async ({
    page,
  }) => {
    await page.components.comboBox('dataViewSelector').setSelectedOptions([DATA_VIEW]);
    await page.components.comboBox('searchMetricField').setSelectedOptions(['bytes'], {
      timeout: 10_000,
    });

    await page.testSubj.locator('startSearch').click();
    // Save while the shard_delay search is still in-flight.
    await saveBackgroundSearch(page);
    await expect(page.testSubj.locator('restoreSearch')).toBeVisible({ timeout: 120_000 });

    await page.testSubj.locator('restoreSearch').click();
    await expect(page.testSubj.locator('searchResults-2')).toBeVisible({ timeout: 60_000 });
  });
});
