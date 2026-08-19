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

test.describe('Add data tutorials', { tag: tags.stateful.classic }, () => {
  test('tutorial directory should redirect to integrations app', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.get('/app/home#/tutorial_directory'));
    await expect(page).toHaveURL(/\/app\/integrations/);
  });
});
