/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 *
 * End-to-end journey tests for the Background Search management UI.
 *
 * Each parallel worker operates in its own Kibana space. Background searches have
 * namespaceType:'single' so they are fully space-scoped — workers never see each
 * other's sessions.
 *
 * ES data (logstash-*) is shared and loaded once in global.setup.ts.
 * Kibana saved objects (dashboard "Delayed 5s" etc.) are loaded per-space in
 * beforeAll via scoutSpace.savedObjects.load().
 *
 * The Kibana server must be started with:
 *   --data.search.sessions.enabled=true
 *   --data.search.sessions.management.refreshInterval=10s
 * (both provided by the `search_sessions` Scout server config set, auto-detected
 * from the `scout_search_sessions` directory name.)
 */

import { v4 as uuidv4 } from 'uuid';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { expect } from '@kbn/scout/ui';
import type { KbnClient } from '@kbn/scout';
import { spaceTest, SESSION_API_PATH, DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE } from '../fixtures';

// Version header required by the background search internal API.
const SESSION_VERSION = '1';
const SESSION_HEADERS = {
  [ELASTIC_HTTP_VERSION_HEADER]: SESSION_VERSION,
  'kbn-xsrf': 'anything',
  'kbn-system-request': 'true',
};

/**
 * Delete every background search in the given Kibana space.
 * Path prefix `/s/{spaceId}` scopes the query to that space only.
 */
async function deleteAllBackgroundSearches(kbnClient: KbnClient, spaceId: string) {
  const spacePath = spaceId === 'default' ? '' : `/s/${spaceId}`;
  const { data } = await kbnClient.request<{ saved_objects: Array<{ id: string }> }>({
    method: 'POST',
    path: `${spacePath}${SESSION_API_PATH}/_find`,
    headers: SESSION_HEADERS,
    body: { page: 1, perPage: 10_000, sortField: 'created', sortOrder: 'asc' },
  });

  if (data.saved_objects.length === 0) return;

  const spacedDeletePath = (id: string) => `${spacePath}${SESSION_API_PATH}/${id}`;
  await Promise.all(
    data.saved_objects.map(({ id }) =>
      kbnClient.request({
        method: 'DELETE',
        path: spacedDeletePath(id),
        headers: SESSION_HEADERS,
        ignoreErrors: [404],
      })
    )
  );
}

spaceTest.describe('Background Search management UI', { tag: '@local-stateful-classic' }, () => {
  // Dashboard ID varies per space (createNewCopies:true assigns a new ID on each load).
  // We capture it from the load response in beforeAll.
  let dashboardId: string;

  spaceTest.beforeAll(async ({ kbnClient, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();

    // Load dashboard saved objects into the worker's space. scoutSpace.savedObjects.load()
    // uses createNewCopies:true so each space gets unique IDs — capture the dashboard ID
    // by looking up the loaded object by its well-known title.
    const loadedObjects = await scoutSpace.savedObjects.load(DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE);
    const dashboardTitle = 'Delayed 5s';
    const delayed5s = loadedObjects.find(
      (so) => so.type === 'dashboard' && so.title === dashboardTitle
    );
    if (!delayed5s) {
      throw new Error(
        `Dashboard "${dashboardTitle}" not found in loaded objects. ` +
          `Available: ${loadedObjects
            .filter((so) => so.type === 'dashboard')
            .map((so) => so.title)
            .join(', ')}`
      );
    }
    dashboardId = delayed5s.id;

    await scoutSpace.uiSettings.set({ defaultIndex: 'logstash-*', 'search:timeout': 10_000 });
    await deleteAllBackgroundSearches(kbnClient, scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    await deleteAllBackgroundSearches(kbnClient, scoutSpace.id);
    await scoutSpace.uiSettings.unset('defaultIndex', 'search:timeout');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  /**
   * Full lifecycle journey:
   *  1. Open the "Delayed 5s" dashboard (space-scoped copy).
   *  2. Submit the query and save it as a background search.
   *  3. Navigate to the management page and wait for the search to complete.
   *  4. Rename the background search and verify its details.
   *  5. Click "View" to return to the dashboard.
   *  6. Verify the dashboard panel is rendered.
   *  7. Delete the background search from the management page.
   */
  spaceTest(
    'saves a background search from a dashboard, verifies it in management, then deletes it',
    async ({ page, pageObjects }) => {
      // End-to-end journey across dashboard + management pages.
      spaceTest.setTimeout(180_000);
      const searchName = `Background search - ${uuidv4()}`;

      await spaceTest.step('open the Delayed 5s dashboard', async () => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
      });

      await spaceTest.step('submit query and save as a background search', async () => {
        // Click the main submit button to trigger a fresh search.
        const submitBtn = page.testSubj.locator('querySubmitButton');
        await submitBtn.waitFor({ state: 'visible', timeout: 15_000 });
        await submitBtn.click();

        // The secondary "Send to background" button appears while the search is running.
        // Click it to persist the search as a background search.
        const bgSubmitBtn = page.testSubj.locator('querySubmitButton-secondary-button');
        await bgSubmitBtn.waitFor({ state: 'visible', timeout: 15_000 });
        await bgSubmitBtn.click();

        // Wait for the toast confirming the background search has been saved.
        await page.testSubj
          .locator('backgroundSearchToastLink')
          .waitFor({ state: 'visible', timeout: 20_000 });

        // Wait for the dashboard to finish rendering — this ensures all search IDs are
        // registered in the background search's idMapping before we navigate away.
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step(
        'navigate to management and wait for the background search to complete',
        async () => {
          await pageObjects.backgroundSearchManagement.goTo();

          // Management page auto-refreshes every 10 s (server arg).
          // Allow up to 60 s for the background search to transition to "complete".
          await pageObjects.backgroundSearchManagement.waitForRowStatus('complete', 60_000);
        }
      );

      await spaceTest.step('rename the background search and verify details', async () => {
        await pageObjects.backgroundSearchManagement.renameRow(searchName);

        // Trigger a manual refresh so the new name is reflected without waiting
        // for the 10-second auto-refresh interval.
        await page.testSubj.click('sessionManagementRefreshBtn');

        await pageObjects.backgroundSearchManagement.expectRowCount(1);
        await expect(page.testSubj.locator('sessionManagementNameCol')).toHaveText(searchName, {
          timeout: 15_000,
        });
        const expires = await pageObjects.backgroundSearchManagement.getRowExpires();
        expect(expires).not.toBe('--');
      });

      await spaceTest.step('navigate back to the dashboard via the management link', async () => {
        await pageObjects.backgroundSearchManagement.viewRow();
        await page.testSubj
          .locator('embeddablePanelHeading-SumofBytesbyExtension(Delayed5s)')
          .waitFor({ state: 'visible', timeout: 30_000 });

        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('delete the background search from the management page', async () => {
        await pageObjects.backgroundSearchManagement.goTo();

        // Trigger an explicit refresh to wait for the initial data load.
        await pageObjects.backgroundSearchManagement.refresh();

        await pageObjects.backgroundSearchManagement.expectRowCount(1);
        await pageObjects.backgroundSearchManagement.deleteRow();
        await pageObjects.backgroundSearchManagement.waitForEmptyTable(30_000);
      });
    }
  );
});
