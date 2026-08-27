/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Restoring a Discover background search, and the navigations that drop the session.
 *
 * Local-only: `STALLING_DSL_FILTER` relies on the `test-error-query` Elasticsearch module,
 * which is not present on Elastic Cloud.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  getSessionCookieHeader,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  LOGSTASH_TIME_RANGE,
  STALLING_DSL_FILTER,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

spaceTest.describe('Discover background search restore', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterEach(async ({ apiServices, page, scoutSpace }) => {
    await apiServices.backgroundSearch.cleanup.deleteAll({
      cookieHeader: await getSessionCookieHeader(page),
      spaceId: scoutSpace.id,
    });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'navigating to surrounding documents drops the background search entrypoint',
    async ({ page, pageObjects }) => {
      await pageObjects.dataGrid.openDocumentDetails({ rowIndex: 0 });

      const flyout = page.testSubj.locator('docViewerFlyout');
      await expect(flyout).toBeVisible();
      // The two flyout actions share `docTableRowAction` and are icon-only (no visible text);
      // find by aria-label instead of innerText.
      const surroundingDocsAction = flyout.locator(
        '[data-test-subj="docTableRowAction"][aria-label="View surrounding documents"]'
      );
      await expect(surroundingDocsAction).toBeVisible();
      await surroundingDocsAction.click();

      // Wait for the context view to be the page we're on before asserting on an absence,
      // otherwise the entrypoint could simply not have rendered yet.
      await expect(page.testSubj.locator('discoverContextAppTitle')).toBeVisible();
      await expect(pageObjects.backgroundSearch.flyoutEntrypoint).toBeHidden();
    }
  );

  spaceTest(
    'restoring a background search does not start any new searches',
    async ({ page, pageObjects }) => {
      await spaceTest.step('save a slow search to the background', async () => {
        await pageObjects.filterBar.addDslFilter(STALLING_DSL_FILTER);
        await pageObjects.backgroundSearch.sendToBackground();
      });

      await pageObjects.backgroundSearchManagement.goTo();
      await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');

      const searchesCountBeforeRestore =
        await pageObjects.backgroundSearchManagement.getRowSearchesCount();
      const restoreUrl = await pageObjects.backgroundSearchManagement.getRowRestoreUrl();

      await spaceTest.step('restore it by loading Discover from scratch', async () => {
        // Loading the restore URL directly (rather than clicking "View") makes Discover issue
        // the same requests it did on the original run, so the search count is comparable.
        await page.goto(new URL(restoreUrl, page.url()).href);
        await pageObjects.discover.waitUntilSearchingHasFinished();
        // No session-restoration warnings should be raised.
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      });

      await spaceTest.step('the search count is unchanged', async () => {
        await pageObjects.backgroundSearchManagement.goTo();
        expect(await pageObjects.backgroundSearchManagement.getRowSearchesCount()).toBe(
          searchesCountBeforeRestore
        );
      });
    }
  );
});
