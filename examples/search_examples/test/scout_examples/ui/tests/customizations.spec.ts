/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const LOGSTASH_TIME_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

test.describe('Discover customization examples', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({ defaultIndex: 'logstash-*' });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('discoverCustomizationExamples');
    await page.testSubj.locator('logsViewSelectorButton').waitFor({ state: 'visible' });
    await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
  });

  test('CustomDataViewPicker loads a saved session', async ({ page }) => {
    await page.testSubj.locator('logsViewSelectorButton').click();
    await page.testSubj.locator('logsViewSelectorOption-ASavedSearch').click();

    const sharedItem = page.locator('[data-shared-item][data-title][data-description]');
    await expect(sharedItem).toHaveAttribute('data-title', 'A Saved Search');
    await expect(sharedItem).toHaveAttribute('data-description', 'A Saved Search Description');
  });
});
