/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

// Sequential suite: these tests mutate global cluster state (ES data + data views),
// so they run in the single-worker `tests/` config instead of the space-isolated
// parallel pool.
test.describe('Visualize - no data', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  // Restore the shared cluster state this suite mutates (deleted indices + created
  // data view) so it doesn't leak into any other config sharing the deployment.
  test.afterAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });
  });

  test('shows the integrations prompt when there is no data', async ({
    page,
    esClient,
    kbnClient,
  }) => {
    // Scout's esArchiver fixture is load-only by design, so remove the logstash
    // indices directly to reach an empty-cluster state for this sequential suite.
    // `action.destructive_requires_name` rejects wildcard deletes, so resolve the
    // concrete index names first (a read, which allows wildcards) and delete those.
    const existing = await esClient.indices.get({
      index: 'logstash-*',
      allow_no_indices: true,
      ignore_unavailable: true,
    });
    const indices = Object.keys(existing);
    if (indices.length > 0) {
      await esClient.indices.delete({ index: indices });
    }
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });

    await page.gotoApp('visualize');

    const addIntegrations = page.testSubj.locator('noDataDefaultActionButton');
    await expect(addIntegrations).toBeVisible();
    await addIntegrations.click();
    await page.waitForURL(/integrations\/browse/);
  });

  test('shows the create data view prompt when no data views exist', async ({
    page,
    esArchiver,
    kbnClient,
    pageObjects: { visualize, dataViewEditor },
  }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });

    await page.gotoApp('visualize');

    await visualize.openCreateDataViewFlyout();
    await dataViewEditor.setTitle('logstash*');
    await dataViewEditor.save();

    await expect(page.testSubj.locator('newItemButton')).toBeVisible();
  });
});
