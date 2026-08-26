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

test.describe('Partial results example plugin', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('partialResultsExample');
    await page.testSubj.locator('example-help').waitFor({ state: 'visible' });
  });

  test('records window events in the results table', async ({ page }) => {
    const help = page.testSubj.locator('example-help');
    await help.click();
    await help.click();
    await help.click();

    const eventCells = page.testSubj.locator('example-column-event');
    await expect(page.testSubj.locator('example-table')).toBeVisible();
    await expect(eventCells).toHaveCount(3);
    await expect(eventCells.filter({ hasText: 'click' })).toBeVisible();
  });
});
