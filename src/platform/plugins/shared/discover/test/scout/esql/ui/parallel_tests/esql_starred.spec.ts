/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const query = 'FROM logstash-* | SORT @timestamp DESC';

spaceTest.describe('Discover ES|QL starred queries', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ page, config, scoutSpace }) => {
    const favoritesUrl = `${config.hosts.kibana}/s/${scoutSpace.id}/internal/content_management/favorites/esql_query`;
    const headers = { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'kibana' };
    // Favorites belong to the browser user's profile as well as the space.
    const response = await page.request.get(favoritesUrl, { headers });
    expect(response.ok()).toBe(true);
    const {
      favoriteMetadata = {},
    }: { favoriteMetadata?: Record<string, { queryString: string }> } = await response.json();
    for (const [id, metadata] of Object.entries(favoriteMetadata)) {
      if (metadata.queryString === query) {
        const removal = await page.request.post(
          `${favoritesUrl}/${encodeURIComponent(id)}/unfavorite`,
          {
            headers,
          }
        );
        expect(removal.ok()).toBe(true);
      }
    }
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  // Migrated from x-pack/platform/test/functional/apps/discover/group3/esql_starred.ts.
  spaceTest(
    'stars a query, persists it across reload, and runs it from Starred',
    async ({ page, pageObjects: { discover, esqlEditor } }) => {
      const starredQuery = esqlEditor.getStarredRow(query);

      await spaceTest.step('star a query from history', async () => {
        await discover.writeAndSubmitEsqlQuery(query);
        await esqlEditor.toggleHistoryPanel();
        const historyQuery = esqlEditor.getHistoryRow(query);
        // The star renders optimistically; wait for the background write before reloading.
        const persisted = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            /\/favorites\/esql_query\/[^/]+\/favorite$/.test(new URL(response.url()).pathname)
        );
        await historyQuery.getByRole('button', { name: 'Add ES|QL query to Starred' }).click();
        expect((await persisted).ok()).toBe(true);
        await esqlEditor.openStarredQueriesTab();
        await expect(starredQuery).toBeVisible();
      });

      await spaceTest.step('persist across reload', async () => {
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await esqlEditor.toggleHistoryPanel();
        await esqlEditor.openStarredQueriesTab();
        await expect(starredQuery).toBeVisible();
      });

      await spaceTest.step('load and run a starred query', async () => {
        await page.gotoApp('discover');
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitEsqlQuery('FROM logstash-* | LIMIT 1');
        await esqlEditor.toggleHistoryPanel();
        await esqlEditor.openStarredQueriesTab();
        await starredQuery.getByRole('button', { name: 'Run query', exact: true }).click();
        await expect.poll(() => discover.getEsqlQueryValue()).toBe(query);
        await discover.waitUntilTabIsLoaded();
      });
    }
  );
});
