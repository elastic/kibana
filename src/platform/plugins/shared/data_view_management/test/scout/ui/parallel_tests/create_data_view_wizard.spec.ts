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

// Migrated from: src/platform/test/functional/apps/management/group1/_create_index_pattern_wizard.ts

spaceTest.describe('Create data view from index alias', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.uiSettings.set({});
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
    await esClient.indices
      .updateAliases({
        actions: [{ remove: { index: 'blogs', alias: 'alias1' } }],
      })
      .catch(() => {});
    await esClient.indices.delete({ index: 'blogs' }).catch(() => {});
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can create a data view from an index alias and then delete it',
    async ({ pageObjects, page, esClient }) => {
      await spaceTest.step('set up the ES alias', async () => {
        await esClient.index({
          index: 'blogs',
          document: { user: 'matt', message: 20 },
          refresh: 'wait_for',
        });
        await esClient.indices.updateAliases({
          actions: [{ add: { index: 'blogs', alias: 'alias1' } }],
        });
      });

      await spaceTest.step(
        'navigate to data views and create a data view from alias1',
        async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
          await pageObjects.dataViewEditorFlyout.setTitle('alias1');
          await pageObjects.dataViewEditorFlyout.save();
        }
      );

      await spaceTest.step('verify data view was created by checking the page URL', async () => {
        await expect(page).toHaveURL(/\/management\/kibana\/dataViews\/dataView\/.+/);
      });

      await spaceTest.step(
        'delete the data view and verify navigation returns to the data views list',
        async () => {
          await pageObjects.dataViewDetail.delete();
          await expect(page).toHaveURL(/management\/kibana\/dataViews/);
          await expect(pageObjects.dataViewsManagement.table).toBeVisible();
        }
      );
    }
  );
});
