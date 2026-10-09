/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * How Discover tracks the search session id across queries, URL state and query modes.
 * None of these tests store a background search — they only observe the in-flight session id.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  LOGSTASH_TIME_RANGE,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

const FAKE_SEARCH_SESSION_ID = '__test__';

spaceTest.describe('Discover search session state', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.set({ enableESQL: true });
    await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'enableESQL', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('assigns a new search session id to each search', async ({ pageObjects }) => {
    await pageObjects.unifiedTabs.openInspectorForActiveTab();
    const firstSessionId = await pageObjects.inspector.getSearchSessionId();

    await pageObjects.discover.submitQuery();
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await pageObjects.unifiedTabs.openInspectorForActiveTab();
    const secondSessionId = await pageObjects.inspector.getSearchSessionId();
    expect(secondSessionId).not.toBe(firstSessionId);
  });

  spaceTest(
    'picks the search session id up from the URL and restores it with the back button',
    async ({ page, pageObjects }) => {
      await spaceTest.step('a non-existing session id in the URL errors out', async () => {
        await page.goto(`${page.url()}&searchSessionId=${FAKE_SEARCH_SESSION_ID}`);
        await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();
        await page.components.toast().closeAll();

        await pageObjects.unifiedTabs.openInspectorForActiveTab();
        expect(await pageObjects.inspector.getSearchSessionId()).toBe(FAKE_SEARCH_SESSION_ID);
      });

      await spaceTest.step('re-submitting the query starts a fresh session', async () => {
        await pageObjects.discover.submitQuery();
        // The error callout clearing is what proves a successful search replaced the failed
        // restore. The URL losing the session id does not: the failed restore drops it too, so
        // waiting on the URL can return before the new request has been recorded.
        await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeHidden();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        // Also waited on for the next step: going back only reaches the restored session if the
        // fresh search has pushed its own history entry.
        await page.waitForURL((url) => !url.href.includes('searchSessionId'));

        await pageObjects.unifiedTabs.openInspectorForActiveTab();
        expect(await pageObjects.inspector.getSearchSessionId()).not.toBe(FAKE_SEARCH_SESSION_ID);
      });

      await spaceTest.step('going back restores the session from the URL', async () => {
        await page.goBack();
        await page.waitForURL(/searchSessionId/);

        await pageObjects.unifiedTabs.openInspectorForActiveTab();
        expect(await pageObjects.inspector.getSearchSessionId()).toBe(FAKE_SEARCH_SESSION_ID);
      });
    }
  );

  spaceTest('offers the background search entrypoint in ES|QL mode', async ({ pageObjects }) => {
    await pageObjects.discover.selectTextBaseLang();
    await pageObjects.discover.waitUntilSearchingHasFinished();

    // In ES|QL mode the entrypoint is collapsed into the app menu overflow popover.
    await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
    await expect(pageObjects.backgroundSearch.managementTable).toBeVisible();
  });
});
