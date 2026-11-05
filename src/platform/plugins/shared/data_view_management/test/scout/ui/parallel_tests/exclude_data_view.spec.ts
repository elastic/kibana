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

spaceTest.describe(
  'Data view creation with exclusion expression',
  { tag: tags.deploymentAgnostic },
  () => {
    const indexPrefix = (spaceId: string) => `dvm-exclude-${spaceId}`;

    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      const prefix = indexPrefix(scoutSpace.id);
      await esClient.index({
        index: `${prefix}-a`,
        document: { user: 'matt' },
        refresh: 'wait_for',
      });
      await esClient.index({
        index: `${prefix}-b`,
        document: { title: 'hello' },
        refresh: 'wait_for',
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      const prefix = indexPrefix(scoutSpace.id);
      await esClient.indices
        .delete({ index: [`${prefix}-a`, `${prefix}-b`], ignore_unavailable: true })
        .catch(() => {});
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'data view with exclusion pattern shows only included index fields',
      async ({ pageObjects, scoutSpace }) => {
        const prefix = indexPrefix(scoutSpace.id);

        await spaceTest.step('navigate to data views management', async () => {
          await pageObjects.dataViewsManagement.goto();
        });

        await spaceTest.step('create data view with exclusion expression', async () => {
          await pageObjects.dataViewsManagement.openCreateWizard();
          await pageObjects.dataViewEditorFlyout.setTitle(`${prefix}-*,-${prefix}-b`);
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
