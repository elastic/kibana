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
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { spaceTest } from '../fixtures';

// Migrated from: src/platform/test/functional/apps/management/group1/_data_view_create_delete.ts
// Also includes: field count assertion from _index_pattern_results_sort.ts
// Serverless mirror: x-pack/platform/test/serverless/functional/test_suites/management/data_views/_data_view_create_delete.ts
// Table headers and sort tests moved to Jest (indexed_fields_table/components/table/table.test.tsx).
// ES archives are loaded once in parallel_tests/global.setup.ts.

const hiddenIndex = (spaceId: string) => `dvm-hidden-${spaceId}`;

spaceTest.describe(
  'Data view editor — create and delete flows',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeEach(async ({ scoutSpace, browserAuth }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace, esClient }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await esClient.indices
        .delete({ index: hiddenIndex(scoutSpace.id), ignore_unavailable: true })
        .catch(() => {});
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
      async ({ pageObjects }) => {
        await spaceTest.step(
          'open the editor flyout and type a Unicode emoji as the title',
          async () => {
            await pageObjects.dataViewsManagement.goto();
            await pageObjects.dataViewsManagement.openCreateWizard();
            await pageObjects.dataViewEditorFlyout.fillTitle('❤️');
          }
        );

        await spaceTest.step('verify the no-match status message appears', async () => {
          await expect(pageObjects.dataViewEditorFlyout.statusMessage).toContainText(
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
          // Scoped to the archive-owned indices so the exact field count is stable.
          await pageObjects.dataViewEditorFlyout.setTitle('logstash-2015.09.*');
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
      'displays a form error when saving a pattern with no matching indices',
      async ({ pageObjects }) => {
        const { dataViewEditorFlyout } = pageObjects;

        await spaceTest.step(
          'open the create flyout and enter a non-matching pattern',
          async () => {
            await pageObjects.dataViewsManagement.goto();
            await pageObjects.dataViewsManagement.openCreateWizard();
            await dataViewEditorFlyout.fillTitle('log-fake*');
          }
        );

        await spaceTest.step('click save and verify the title field error', async () => {
          await dataViewEditorFlyout.saveButton.click();
          await expect(dataViewEditorFlyout.titleInput).toHaveAccessibleDescription(
            /must match one or more data streams, indices, or index aliases/
          );
          await expect(dataViewEditorFlyout.flyout).toBeVisible();
        });

        await spaceTest.step('close the flyout', async () => {
          await dataViewEditorFlyout.close();
        });
      }
    );

    spaceTest(
      'requires a new timestamp field when the pattern changes to one without the selected field',
      async ({ pageObjects }) => {
        const { dataViewEditorFlyout } = pageObjects;

        await spaceTest.step('enter log* and verify the timestamp field auto-selects', async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
          await dataViewEditorFlyout.setTitle('log*');
          expect(await dataViewEditorFlyout.getTimestampFieldValue()).toBe('@timestamp');
        });

        await spaceTest.step(
          'switch to an index whose only date field has a different name',
          async () => {
            await dataViewEditorFlyout.fillTitle('with-different-timefield');
            await expect.poll(() => dataViewEditorFlyout.getTimestampFieldValue()).toBe('');
          }
        );

        await spaceTest.step('click save and verify the timestamp field error', async () => {
          await dataViewEditorFlyout.saveButton.click();
          await expect(
            dataViewEditorFlyout.flyout.getByRole('combobox', { name: 'Timestamp field' })
          ).toHaveAttribute('aria-invalid', 'true');
          await expect(dataViewEditorFlyout.flyout.getByRole('alert')).toContainText(
            'Select a timestamp field.'
          );
          await expect(dataViewEditorFlyout.flyout).toBeVisible();
        });

        await spaceTest.step('close the flyout', async () => {
          await dataViewEditorFlyout.close();
        });
      }
    );

    spaceTest(
      'can create a data view against a hidden index and allow-hidden persists after reload',
      async ({ pageObjects, page, esClient, scoutSpace }) => {
        const { dataViewEditorFlyout } = pageObjects;
        const index = hiddenIndex(scoutSpace.id);

        await spaceTest.step('create a suite-owned hidden index', async () => {
          // A retry reuses the same space id, so drop any index left by a failed attempt.
          await esClient.indices.delete({ index, ignore_unavailable: true });
          await esClient.indices.create({
            index,
            settings: { index: { hidden: true } },
            mappings: { properties: { '@timestamp': { type: 'date' } } },
          });
          await esClient.index({
            index,
            document: { '@timestamp': new Date().toISOString() },
            refresh: 'wait_for',
          });
        });

        await spaceTest.step('create a data view with allow-hidden enabled', async () => {
          await pageObjects.dataViewsManagement.goto();
          await pageObjects.dataViewsManagement.openCreateWizard();
          await dataViewEditorFlyout.enableAllowHidden();
          await dataViewEditorFlyout.setTitle(index);
          await dataViewEditorFlyout.selectTimestampField('@timestamp');
          await dataViewEditorFlyout.save();
          await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toContainText(index);
        });

        await spaceTest.step('reload and verify allow-hidden is still enabled', async () => {
          await page.reload();
          await pageObjects.dataViewDetail.openEditFlyout();
          await dataViewEditorFlyout.showAdvancedSettings();
          expect(await dataViewEditorFlyout.isAllowHiddenEnabled()).toBe(true);
          await dataViewEditorFlyout.close();
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
