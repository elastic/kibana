/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';

spaceTest.describe('Discover drag and drop', { tag: testData.DISCOVER_STATEFUL_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
    await pageObjects.discover.setQueryMode('classic');
    await page.gotoApp('discover');
    await page.testSubj.locator('dscPage').waitFor({ state: 'visible', timeout: 60_000 });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('supports dragging a field onto the grid', async ({ page, pageObjects }) => {
    await expect(page.testSubj.locator('field-extension')).toBeVisible();
    await expect(page.testSubj.locator('fieldListGrouped__ariaDescription')).toContainText(
      'available fields'
    );
    await expect(pageObjects.discover.getColumnHeader('@timestamp')).toBeVisible();

    await pageObjects.discover.dragFieldToGrid(['extension']);
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await expect(pageObjects.discover.getColumnHeader('extension')).toBeVisible();
    await expect(page.testSubj.locator('fieldListGroupedSelectedFields')).toContainText(
      'extension'
    );
  });

  spaceTest('supports keyboard drag and drop onto the grid', async ({ page, pageObjects }) => {
    const keyboardHandle = page.locator(
      '[data-attr-field="@message"] [data-test-subj="domDragDrop-keyboardHandler"]'
    );

    await expect(page.testSubj.locator('field-@message')).toBeVisible();
    await expect(pageObjects.discover.getColumnHeader('@timestamp')).toBeVisible();

    await keyboardHandle.focus();
    await page.keyboard.press('Enter');
    await page.locator('.domDroppable--active').waitFor({ state: 'visible' });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await expect(pageObjects.discover.getColumnHeader('@message')).toBeVisible();
    await expect(page.testSubj.locator('fieldListGroupedSelectedFields')).toContainText('@message');
  });
});
