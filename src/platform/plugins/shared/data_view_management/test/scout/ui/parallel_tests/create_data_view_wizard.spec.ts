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

const blogsIndex = (spaceId: string) => `dvm-blogs-${spaceId}`;
const aliasName = (spaceId: string) => `dvm-alias-${spaceId}`;

spaceTest.describe('Create data view from index alias', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await esClient.index({
      index: blogsIndex(scoutSpace.id),
      document: { user: 'matt', message: 20 },
      refresh: 'wait_for',
    });
    await esClient.indices.updateAliases({
      actions: [{ add: { index: blogsIndex(scoutSpace.id), alias: aliasName(scoutSpace.id) } }],
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
    // Deleting the index also removes its alias.
    await esClient.indices.delete({ index: blogsIndex(scoutSpace.id) }).catch(() => {});
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can create a data view from an index alias and then delete it',
    async ({ pageObjects, page, scoutSpace }) => {
      await spaceTest.step(
        'navigate to data views and create a data view from the alias',
        async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
          await pageObjects.dataViewEditorFlyout.setTitle(aliasName(scoutSpace.id));
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
