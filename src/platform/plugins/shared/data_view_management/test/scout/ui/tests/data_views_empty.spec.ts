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
import { ES_ARCHIVE_LOGSTASH_FUNCTIONAL } from '../fixtures/constants';
import { mockNoEsData, unmockNoEsData } from '../fixtures/mocks';

// The "no ES data" state is simulated by stubbing the has-data route instead of deleting
// cluster indices. Prompt rendering details are covered by empty_index_list_prompt.test.tsx.

test.describe('Data views empty state', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('shows empty state then allows creating a data view once data is available', async ({
    pageObjects,
    page,
  }) => {
    await test.step('stub the has-data check and verify the empty-state prompt', async () => {
      await mockNoEsData(page);
      // goto() waits for createDataViewButton, which never renders in the no-data state.
      await page.gotoApp('management/kibana/dataViews');
      await expect(page.testSubj.locator('indexPatternEmptyState')).toBeVisible();
      await expect(page.testSubj.locator('createAnyway')).toBeVisible();
    });

    await test.step('remove the stub, refresh, and verify the create button appears', async () => {
      await unmockNoEsData(page);
      await page.testSubj.click('refreshIndicesButton');
      await expect(pageObjects.dataViewsManagement.createButton).toBeVisible();
    });

    await test.step('create a data view from the available data', async () => {
      await pageObjects.dataViewsManagement.openCreateWizard();
      await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
      await pageObjects.dataViewEditorFlyout.save();
    });
  });
});
