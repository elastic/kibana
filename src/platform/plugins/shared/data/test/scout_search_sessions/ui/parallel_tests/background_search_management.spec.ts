/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * End-to-end journey tests for the Background Search management UI.
 *
 * Each parallel worker operates in its own Kibana space. Background searches have
 * namespaceType:'single' so they are fully space-scoped — workers never see each
 * other's sessions.
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
    await deleteAllBackgroundSearches(kbnClient, scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    await deleteAllBackgroundSearches(kbnClient, scoutSpace.id);
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
   */
  spaceTest(
    'saves a background search from a dashboard, verifies it in management',
    async ({ page, pageObjects }) => {
      spaceTest.setTimeout(180_000);

      await spaceTest.step('open the Delayed 5s dashboard', async () => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
      });

      await spaceTest.step('submit query and save as a background search', async () => {
        const submitBtn = page.testSubj.locator('querySubmitButton');
        await submitBtn.click();

        // Click the "Send to background" button appears while the search is running to create a background search
        const bgSubmitBtn = page.testSubj.locator('querySubmitButton-secondary-button');
        await bgSubmitBtn.click();

        await page.testSubj
          .locator('backgroundSearchToastLink')
          .waitFor({ state: 'visible', timeout: 20_000 });

        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step(
        'navigate to management and wait for the background search to complete',
        async () => {
          await pageObjects.backgroundSearchManagement.goTo();
          await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');
        }
      );

      await spaceTest.step('rename the background search and verify details', async () => {
        const searchName = `Background search - ${uuidv4()}`;
        await pageObjects.backgroundSearchManagement.renameRow(searchName);
        await page.testSubj.click('sessionManagementRefreshBtn');
        await pageObjects.backgroundSearchManagement.expectRowCount(1);
        await expect(page.testSubj.locator('sessionManagementNameCol')).toHaveText(searchName);
        const expires = await pageObjects.backgroundSearchManagement.getRowExpires();
        // The expiration date is time-dependent, so only verify that a value is present.
        expect(expires.trim()).toMatch(/^\d/);
      });

      await spaceTest.step('navigate back to the dashboard via the management link', async () => {
        await pageObjects.backgroundSearchManagement.viewRow();
        await pageObjects.dashboard.waitForRenderComplete();
        const viz = page.testSubj.locator(
          'embeddablePanelHeading-SumofBytesbyExtension(Delayed5s)'
        );
        await expect(viz).toBeVisible();
      });
    }
  );
});
