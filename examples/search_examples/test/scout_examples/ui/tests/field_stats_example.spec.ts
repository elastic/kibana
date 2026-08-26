/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { LOGSTASH_TIME_RANGE, test } from '../fixtures';

test.describe('Unified field list examples', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({ defaultIndex: 'logstash-*' });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('unifiedFieldListExamples');
    await page.testSubj.locator('dataViewSelector').waitFor({ state: 'visible' });
    await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
    await page.testSubj
      .locator('fieldListGroupedAvailableFields-countLoading')
      .waitFor({ state: 'hidden' });
  });

  test('shows field stats in the sidebar popover', async ({ page }) => {
    await page.testSubj.locator('field-bytes').click();

    await expect(page.testSubj.locator('fieldStats-title')).toBeVisible();
    await expect(page.testSubj.locator('fieldStats-statsFooter')).toContainText('records');
  });
});
