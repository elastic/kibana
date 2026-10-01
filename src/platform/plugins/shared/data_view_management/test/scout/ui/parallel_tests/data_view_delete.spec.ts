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
import { spaceTest } from '../fixtures';

// Migrated from: src/platform/test/functional/apps/management/group1/_data_view_create_delete.ts
// Serverless mirror: x-pack/platform/test/serverless/functional/test_suites/management/data_views/_data_view_create_delete.ts
// ES archives are loaded once in parallel_tests/global.setup.ts.

spaceTest.describe('Data view editor — delete flow', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ scoutSpace, browserAuth }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can delete a data view and navigate back to the listing page',
    async ({ pageObjects, page }) => {
      await spaceTest.step('create a logstash data view', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
        await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
        await pageObjects.dataViewEditorFlyout.save();
      });

      await spaceTest.step('delete the data view', async () => {
        await pageObjects.dataViewDetail.delete();
      });

      await spaceTest.step('verify navigation returns to the data views list', async () => {
        await expect(page).toHaveURL(/management\/kibana\/dataViews/);
      });
    }
  );
});
