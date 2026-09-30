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

// Migrated from: src/platform/test/functional/apps/management/group1/_index_patterns_empty.ts
// Stateful only: requires a clean empty state (no user indices) to show the empty-state prompt.
// The second FTR test ("doesn't show read-only badge") is dropped — already covered by
// data_views_feature_controls_security.spec.ts for an all-privileges admin user.

test.describe('Data views empty state', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.uiSettings.replace({});
    // Delete all non-system indices so hasESData() returns false and the empty-state prompt appears.
    // This mirrors what the original FTR test did with esArchiver.unload().
    const catResult = await esClient.cat.indices({ h: 'index', format: 'json' });
    const userIndices = catResult
      .map((r) => (r as Record<string, string>).index)
      .filter((name): name is string => !!name && !name.startsWith('.'));
    if (userIndices.length > 0) {
      await esClient.indices
        .delete({ index: userIndices, ignore_unavailable: true })
        .catch(() => {});
    }
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ esClient, kbnClient, esArchiver }) => {
    await esClient.indices.delete({ index: 'logstash-a' }).catch(() => {});
    await kbnClient.savedObjects.clean({ types: ['index-pattern'] });
    // The beforeAll deleted all user indices to produce the empty state.
    // Restore the logstash archive so subsequent sequential specs find the
    // data they need. This is teardown of state we destroyed, not coupling.
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
  });

  test('shows empty state then allows creating a data view once an index appears', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    await test.step('navigate to data views and verify empty-state prompt', async () => {
      // goto() waits for createDataViewButton which never appears in the no-data empty state,
      // so navigate directly and wait for the empty state panel instead.
      await page.gotoApp('management/kibana/dataViews');
      await page.testSubj.locator('indexPatternEmptyState').waitFor({ state: 'visible' });
      await expect(page.testSubj.locator('createAnyway')).toBeVisible();
    });

    await test.step('create an index via API so the listing can detect it', async () => {
      await esClient.index({
        index: 'logstash-a',
        document: { user: 'matt', message: 20 },
        refresh: 'wait_for',
      });
    });

    await test.step('refresh the index list and verify the create button appears', async () => {
      await page.testSubj.click('refreshIndicesButton');
      await expect(pageObjects.dataViewsManagement.createButton).toBeVisible({ timeout: 10_000 });
    });

    await test.step('create a data view from the new index', async () => {
      await pageObjects.dataViewsManagement.openCreateWizard();
      await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
      await pageObjects.dataViewEditorFlyout.save();
    });
  });
});
