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
import { test } from '../fixtures';

test.describe('Short URLs', { tag: tags.stateful.classic }, () => {
  test('shows Page for missing short URL', async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('home');

    // Navigate to a non-existent short URL
    await pageObjects.share.gotoNonExistentShortUrl('foofoo');

    // Verify the 404 error page is displayed
    await expect(page).toHaveTitle('Not Found - Elastic');

    // Wait for and verify the error prompt is visible
    await pageObjects.share.waitForErrorPrompt();

    // Click the back to home button
    await pageObjects.share.clickBackToHomeButton();

    // Verify we're back on the home page
    await expect(page).toHaveTitle('Home - Elastic');
  });
});
