/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('User Storage - first paint', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('userStorageTest');
  });

  test('renders the registered default for test:string_key on first paint', async ({ page }) => {
    await expect(page.testSubj.locator('userStorageTest:string-key-value')).toHaveText(
      'default_value'
    );
  });
});
