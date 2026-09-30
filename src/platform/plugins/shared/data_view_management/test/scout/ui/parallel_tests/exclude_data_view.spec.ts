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

// Migrated from: src/platform/test/functional/apps/management/group1/_exclude_index_pattern.ts
// Serverless mirror: x-pack/platform/test/serverless/functional/test_suites/management/data_views/_exclude_index_pattern.ts

spaceTest.describe(
  'Data view creation with exclusion expression',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.set({});
      await esClient.index({ index: 'index-a', document: { user: 'matt' }, refresh: 'wait_for' });
      await esClient.index({ index: 'index-b', document: { title: 'hello' }, refresh: 'wait_for' });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await esClient.indices.delete({ index: 'index-a' }).catch(() => {});
      await esClient.indices.delete({ index: 'index-b' }).catch(() => {});
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'data view with exclusion pattern shows only included index fields',
      async ({ pageObjects }) => {
        await spaceTest.step('navigate to data views management', async () => {
          await pageObjects.dataViewsManagement.goto();
        });

        await spaceTest.step('create data view with exclusion expression', async () => {
          await pageObjects.dataViewsManagement.openCreateWizard();
          await pageObjects.dataViewEditorFlyout.setTitle('index-*,-index-b');
          await pageObjects.dataViewEditorFlyout.save();
        });

        await spaceTest.step(
          'verify field count: five metafields plus keyword and text version of user field = 7',
          async () => {
            const fieldCount = await pageObjects.dataViewDetail.getFieldsTabCount();
            expect(fieldCount).toBe(7);
          }
        );
      }
    );
  }
);
