/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke test that the search_examples search-sessions demo still wires
 * start/save/restore against the real session APIs. Requires SNAPSHOT ES for
 * the shard_delay aggregation.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SESSION_API_PATH = '/internal/session';
const SESSION_API_VERSION = '1';
const SESSION_HEADERS = {
  [ELASTIC_HTTP_VERSION_HEADER]: SESSION_API_VERSION,
  'kbn-xsrf': 'anything',
  'kbn-system-request': 'true',
};

/** Deletes every search session so leftovers do not interfere with later runs. */
async function deleteAllSearchSessions(kbnClient: KbnClient): Promise<void> {
  const { data } = await kbnClient.request<{ saved_objects: Array<{ id: string }> }>({
    method: 'POST',
    path: `${SESSION_API_PATH}/_find`,
    headers: SESSION_HEADERS,
    body: { page: 1, perPage: 10_000, sortField: 'created', sortOrder: 'asc' },
  });

  if (data.saved_objects.length === 0) {
    return;
  }

  await Promise.all(
    data.saved_objects.map(({ id }) =>
      kbnClient.request({
        method: 'DELETE',
        path: `${SESSION_API_PATH}/${id}`,
        headers: SESSION_HEADERS,
        ignoreErrors: [404],
      })
    )
  );
}

test.describe('Search session example', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient, isSnapshotBuild }) => {
    test.skip(!isSnapshotBuild, 'Requires shard_delay agg (SNAPSHOT builds only)');
    await deleteAllSearchSessions(kbnClient);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Privileged: saving/restoring sessions needs more than viewer.
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.searchExamples.gotoSearchSessions();
  });

  test.afterEach(async ({ kbnClient }) => {
    await deleteAllSearchSessions(kbnClient);
  });

  test.afterAll(async ({ kbnClient, isSnapshotBuild }) => {
    if (!isSnapshotBuild) {
      return;
    }
    await deleteAllSearchSessions(kbnClient);
  });

  test('should start search, save session, restore session using restore button', async ({
    pageObjects,
  }) => {
    const { searchExamples } = pageObjects;

    await test.step('configure demo', async () => {
      await searchExamples.configureSearchSessionDemo();
    });

    await test.step('start search and save session', async () => {
      await searchExamples.startSearch.click();
      await searchExamples.saveBackgroundSearch();
      // shard_delay keeps the search in-flight until save/restore finish
      await expect(searchExamples.restoreSearch).toBeVisible({ timeout: 120_000 });
    });

    await test.step('restore session', async () => {
      await searchExamples.restoreSearch.click();
      // shard_delay keeps the search in-flight until save/restore finish
      await expect(searchExamples.searchResults(2)).toBeVisible({ timeout: 60_000 });
    });
  });
});
