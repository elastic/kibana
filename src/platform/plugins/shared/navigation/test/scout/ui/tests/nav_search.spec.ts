/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

/**
 * Solution-agnostic nav-search mechanics: reveal, fill, select a result, and
 * conceal. Uses the Dashboards core app so the suite never depends on any
 * solution-owned content.
 */
test.describe('nav search', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
  });

  test('reveal, fill, select and conceal', async ({ page, browserAuth }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('home');

    await page.testSubj.click('nav-search-reveal');
    await page.testSubj.fill('nav-search-input', 'dashboards');
    await page.locator('[data-test-subj="nav-search-option"][url="/app/dashboards"]').click();
    await page.testSubj.click('nav-search-conceal');

    await page.waitForURL(/app\/dashboards/);
    expect(page.url()).toContain('app/dashboards');
  });
});
