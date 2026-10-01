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

const hiddenIndex = (spaceId: string) => `dvm-hidden-${spaceId}`;

spaceTest.describe('Data view editor — create flows', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ scoutSpace, browserAuth }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await browserAuth.loginAsAdmin();
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
      // makelogs indices only: the scope the FTR field count (86) was measured against.
      const pattern = 'logstash-2015.09.1*';

      await spaceTest.step('navigate to data views and create logstash data view', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
        await pageObjects.dataViewEditorFlyout.setTitle(pattern);
        await pageObjects.dataViewEditorFlyout.selectTimestampField('@timestamp');
        await pageObjects.dataViewEditorFlyout.save();
      });

      await spaceTest.step('verify page heading and URL', async () => {
        await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toContainText(pattern);
        await expect(page).toHaveURL(/\/management\/kibana\/dataViews\/dataView\/.+/);
      });

      await spaceTest.step('verify field count matches the makelogs mapping', async () => {
        expect(await pageObjects.dataViewDetail.getFieldsTabCount()).toBe(86);
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

      await spaceTest.step('set title to mixed matched/unmatched expression and save', async () => {
        await pageObjects.dataViewEditorFlyout.setTitle('l*,z*');
        await pageObjects.dataViewEditorFlyout.save();
      });

      await spaceTest.step('delete the data view', async () => {
        await pageObjects.dataViewDetail.delete();
        await expect(page).toHaveURL(/management\/kibana\/dataViews/);
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
});
