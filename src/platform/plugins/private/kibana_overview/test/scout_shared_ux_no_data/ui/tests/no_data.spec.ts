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

test.describe('Kibana Overview - No Data', { tag: ['@local-stateful-classic'] }, () => {
  test('displays no data page when no data exists', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');
    await expect(page.testSubj.locator('kbnNoDataPage')).toBeVisible();
  });

  test('click on add integrations opens integrations', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');
    await expect(page.testSubj.locator('kbnNoDataPage')).toBeVisible();

    await page.testSubj.click('noDataDefaultActionButton');
    await expect(page).toHaveURL(/integrations\/browse/);
  });
});
