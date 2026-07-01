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
import {
  ADVANCED_SETTINGS_APP_PATH,
  ADVANCED_SETTINGS_SEARCH_BAR_SUBJ,
  DATA_VIEWS_CACHE_MAX_AGE_SETTING_SUBJ,
} from '../../fixtures/constants';

test.describe(
  'Data view cache advanced setting (serverless)',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp(ADVANCED_SETTINGS_APP_PATH);
      // Wait for the settings page to render so the absence assertion is meaningful
      // (otherwise it would pass simply because the page hasn't loaded yet).
      await expect(page.testSubj.locator(ADVANCED_SETTINGS_SEARCH_BAR_SUBJ)).toBeVisible({
        timeout: 30_000,
      });
    });

    test('does not show data_views:cache_max_age setting', async ({ page }) => {
      await expect(page.testSubj.locator(DATA_VIEWS_CACHE_MAX_AGE_SETTING_SUBJ)).toHaveCount(0);
    });
  }
);
