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
// Also includes: field count assertion from _index_pattern_results_sort.ts
// Serverless mirror: x-pack/platform/test/serverless/functional/test_suites/management/data_views/_data_view_create_delete.ts
// Form validation tests moved to Jest (data_view_editor_flyout_content.test.tsx).
// Table headers sort tests moved to Jest (table.test.xlsx).
// ES archives are loaded once in parallel_tests/global.setup.ts.

spaceTest.describe(
  'Data view editor — create and delete flows',
  { tag: tags.deploymentAgnostic },
  () => {
    // Sentinel index used only to guarantee hasESData=true when the global setup project is
    // skipped (--project local). Named to avoid conflicting with any archive index so that
    // esArchiver.loadIfNeeded still loads logstash_functional / makelogs in full.
    const SENTINEL_INDEX = 'data-view-management-sentinel';

    spaceTest.beforeAll(async ({ scoutSpace, esClient }) => {
      await scoutSpace.uiSettings.set({});
      await esClient.index({
        index: SENTINEL_INDEX,
        document: { '@timestamp': new Date().toISOString() },
        refresh: 'wait_for',
      });
    });

    spaceTest.beforeEach(async ({ scoutSpace, browserAuth }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace, esClient }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await esClient.indices.delete({ index: SENTINEL_INDEX }).catch(() => {});
    });

    spaceTest(
      'can open the editor flyout and close it without creating a data view',
      async ({ pageObjects }) => {
        await spaceTest.step('navigate to data views and open the editor flyout', async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
        });

        await spaceTest.step(
          'close the flyout and verify the listing page is still shown',
          async () => {
            await pageObjects.dataViewEditorFlyout.close();
            await expect(pageObjects.dataViewsManagement.createButton).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'special characters in the title input show a no-match status message',
      async ({ pageObjects, page }) => {
        await spaceTest.step(
          'open the editor flyout and type a Unicode emoji as the title',
          async () => {
            await pageObjects.dataViewsManagement.goto();
            await pageObjects.dataViewsManagement.openCreateWizard();
            const titleInput = page.testSubj.locator('createIndexPatternTitleInput');
            await titleInput.fill('❤️');
            await titleInput
              .and(page.locator('[data-is-validating="0"]'))
              .waitFor({ state: 'visible' });
          }
        );

        await spaceTest.step('verify the no-match status message appears', async () => {
          await expect(page.testSubj.locator('createIndexPatternStatusMessage')).toContainText(
            "doesn't match any data streams, indices, or index aliases"
          );
        });

        await spaceTest.step('close the flyout', async () => {
          await pageObjects.dataViewEditorFlyout.close();
        });
      }
    );

    spaceTest(
      'can create a logstash data view and verify page heading, URL, and field count',
      async ({ pageObjects, page }) => {
        await spaceTest.step('navigate to data views and create logstash data view', async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
          await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
          await pageObjects.dataViewEditorFlyout.selectTimestampField('@timestamp');
          await pageObjects.dataViewEditorFlyout.save();
        });

        await spaceTest.step('verify page heading and URL', async () => {
          await expect(page.testSubj.locator('headerGlobalNav')).toBeAttached();
          await expect(page).toHaveURL(/\/management\/kibana\/dataViews\/dataView\/.+/);
        });

        await spaceTest.step('verify field count matches real logstash data', async () => {
          const fieldCount = await pageObjects.dataViewDetail.getFieldsTabCount();
          expect(fieldCount).toBe(86);
        });
      }
    );

    spaceTest(
      'can create data view with mixed matched and unmatched index pattern segments',
      async ({ pageObjects, page }) => {
        await spaceTest.step('navigate and open editor flyout', async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
        });

        await spaceTest.step(
          'set title to mixed matched/unmatched expression and save',
          async () => {
            await pageObjects.dataViewEditorFlyout.setTitle('l*,z*');
            await pageObjects.dataViewEditorFlyout.save();
          }
        );

        await spaceTest.step('delete the data view', async () => {
          await pageObjects.dataViewDetail.delete();
          await expect(page).toHaveURL(/management\/kibana\/dataViews/);
        });
      }
    );

    spaceTest(
      'resetting the timestamp field works when switching to an index without date fields',
      async ({ pageObjects }) => {
        await spaceTest.step('navigate and open editor flyout', async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
        });

        await spaceTest.step(
          'set title to log* and verify timestamp auto-detects as timestamp field',
          async () => {
            await pageObjects.dataViewEditorFlyout.setTitle('log*');
            const tsValue = await pageObjects.dataViewEditorFlyout.getTimestampFieldValue();
            expect(tsValue).toBe('@timestamp');
          }
        );

        await spaceTest.step(
          'change title to without-timefield and verify timestamp is cleared',
          async () => {
            await pageObjects.dataViewEditorFlyout.setTitle('without-timefield');
            await expect
              .poll(() => pageObjects.dataViewEditorFlyout.getTimestampFieldValue())
              .toBe('');
          }
        );

        await spaceTest.step('save and clean up', async () => {
          await pageObjects.dataViewEditorFlyout.save();
          await pageObjects.dataViewDetail.delete();
        });
      }
    );

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
  }
);
