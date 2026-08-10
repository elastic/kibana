/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, loginAndGoToDiscover, navigateToFirstDocContext } from '../fixtures';

spaceTest.describe('Discover context - accessibility', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await loginAndGoToDiscover({ browserAuth, pageObjects });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should tab from the Columns control to the Load link',
    async ({ page, pageObjects }) => {
      await navigateToFirstDocContext(pageObjects);

      // Skip to main content via Tab + Enter, then Tab through toolbar controls.
      // Columns is always available (including summary-only), so it precedes Load more.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');

      const activeElement = page.locator(':focus');
      await expect(activeElement).toHaveAttribute('data-test-subj', /dataGridColumnSelectorButton/);

      await page.keyboard.press('Tab');
      await expect(activeElement).toHaveAttribute('data-test-subj', /predecessorsLoadMoreButton/);
    }
  );
});
