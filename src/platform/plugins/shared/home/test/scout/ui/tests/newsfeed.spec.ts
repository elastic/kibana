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

test.describe('Newsfeed', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();
  });

  test('newsfeed button indicates unread items', async ({ page }) => {
    await expect(page.testSubj.locator('newsfeedHasUnread')).toBeVisible();
  });

  test('clicking on newsfeed icon opens the flyout', async ({ pageObjects }) => {
    await pageObjects.overlays.openNewsfeedFlyout();
    await expect(pageObjects.overlays.newsfeedFlyout).toBeVisible();
  });

  test('unread indicator disappears after opening newsfeed', async ({ page, pageObjects }) => {
    await pageObjects.overlays.openNewsfeedFlyout();
    await expect(page.testSubj.locator('newsfeedAllRead')).toBeVisible();
  });

  test('shows news items from newsfeed', async ({ pageObjects }) => {
    await pageObjects.overlays.openNewsfeedFlyout();
    await expect(pageObjects.overlays.newsfeedFlyout).toBeVisible();
    const newsItems = pageObjects.overlays.newsfeedFlyout.locator(
      '[data-test-subj="newsHeadAlert"]'
    );
    await expect(newsItems).not.toHaveCount(0);
  });

  test('clicking newsfeed icon again closes the flyout', async ({ pageObjects }) => {
    await pageObjects.overlays.openNewsfeedFlyout();
    await expect(pageObjects.overlays.newsfeedFlyout).toBeVisible();
    await pageObjects.overlays.closeNewsfeedFlyout();
    await expect(pageObjects.overlays.newsfeedFlyout).toBeHidden();
  });
});
