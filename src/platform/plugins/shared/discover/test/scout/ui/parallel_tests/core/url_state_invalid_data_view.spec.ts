/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover URL state: invalid data view ids should surface a warning and
 * fall back rather than render a broken page. Covers two paths from the
 * "discover URL state" describe in
 * `src/platform/test/functional/apps/discover/group5/_url_state.ts`:
 *
 *  - landing URL contains an unknown data view id  → default fallback +
 *    `dscDataViewNotFoundShowDefaultWarning`
 *  - hash mutated in-place to an unknown data view id  → current-view
 *    fallback + `dscDataViewNotFoundShowSavedWarning`
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const INVALID_ID = 'invalid-data-view-id';

spaceTest.describe('Discover URL state - invalid data view', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'falls back to the default data view when the URL contains an invalid id',
    async ({ page, pageObjects }) => {
      const dataViewId = await pageObjects.discover.getCurrentDataViewId();
      const originalUrl = page.url();
      const invalidUrl = originalUrl.replaceAll(dataViewId, INVALID_ID);
      // Sanity-check: if the data view id isn't actually present in
      // `page.url()` (e.g. URL state uses `index:` instead of `dataViewId:`
      // in this Kibana version) the navigation below is a no-op and the
      // toast assertion would silently mask the bug.
      expect(invalidUrl).not.toBe(originalUrl);

      // Force a fresh-page navigation: a same-origin `page.goto(invalidUrl)`
      // is treated by browsers as a hash-only update and the existing
      // Discover SPA keeps its in-memory data view. That makes Discover take
      // the "saved data view" fallback branch (→ `dscDataViewNotFoundShow*
      // SavedWarning`) instead of the "default data view" branch this test
      // exercises. Navigating to about:blank first guarantees a full reload
      // when we go to `invalidUrl`, matching FTR's `browser.navigateTo`.
      await page.goto('about:blank');
      await page.goto(invalidUrl);
      // Toasts auto-dismiss after ~10s, and `waitUntilSearchingHasFinished`
      // can itself take several seconds, so check for the warning toast
      // first — it is dispatched synchronously by the URL fallback and
      // Playwright's auto-retry will catch it as soon as it mounts.
      await expect(page.testSubj.locator('dscDataViewNotFoundShowDefaultWarning')).toBeVisible();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await expect.poll(() => page.url(), { timeout: 15_000 }).toBe(originalUrl);
    }
  );

  spaceTest(
    'falls back to the current data view when the hash is mutated to an invalid id',
    async ({ page, pageObjects }) => {
      const originalHash = await page.evaluate(() => window.location.hash);
      const dataViewId = await pageObjects.discover.getCurrentDataViewId();
      const newHash = originalHash.replaceAll(dataViewId, INVALID_ID);

      // Mutate the hash in place (FTR equivalent of
      // `browser.execute('window.location.hash = ...')`).
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, newHash);
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await expect
        .poll(() => page.evaluate(() => window.location.hash), { timeout: 15_000 })
        .toBe(originalHash);
      await expect(page.testSubj.locator('dscDataViewNotFoundShowSavedWarning')).toBeVisible();
    }
  );
});
