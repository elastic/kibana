/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('Discover customization examples', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('discoverCustomizationExamples');
    await page.testSubj.locator('logsViewSelectorButton').waitFor({ state: 'visible' });
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Sep 19, 2015 @ 06:31:44.000',
      to: 'Sep 23, 2015 @ 18:31:44.000',
    });
  });

  test('CustomDataViewPicker loads a saved session', async ({ page }) => {
    await page.testSubj.click('logsViewSelectorButton');
    await page.testSubj.click('logsViewSelectorOption-ASavedSearch');

    await expect(page.testSubj.locator('discoverSavedSearchTitle')).toHaveText(
      'Discover - A Saved Search'
    );
  });
});
