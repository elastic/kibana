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

// `data_views:cache_max_age` is only registered when `data_views.fieldListCachingEnabled` is on,
// which is the default in stateful and off in serverless.
const CACHE_SETTING_SUBJ = 'management-settings-editField-data_views:cache_max_age';

spaceTest.describe('Data view field caps cache advanced setting', () => {
  spaceTest.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/kibana/settings');
    await page.testSubj.fill('settingsSearchBar', 'Field cache max age');
    await page.testSubj.locator('settingsSearchBar').press('Enter');
  });

  spaceTest('shows the cache setting', { tag: tags.stateful.classic }, async ({ page }) => {
    await expect(page.testSubj.locator(CACHE_SETTING_SUBJ)).toBeVisible();
  });

  spaceTest(
    'does not show the cache setting',
    {
      tag: [
        ...tags.serverless.search,
        ...tags.serverless.observability.complete,
        ...tags.serverless.security.complete,
      ],
    },
    async ({ page }) => {
      // Wait for the search to finish so the absence check is not trivially true.
      await expect(page.testSubj.locator('settingsEmptyState')).toBeVisible();
      await expect(page.testSubj.locator(CACHE_SETTING_SUBJ)).toBeHidden();
    }
  );
});
