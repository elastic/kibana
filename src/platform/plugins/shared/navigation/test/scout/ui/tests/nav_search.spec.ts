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
 * Solution-agnostic nav-search mechanics. Uses the Dashboards core app so the
 * suite never depends on any solution-owned content.
 */

const SPACE = {
  id: 'nav-search-space',
  name: 'Nav Search Space',
  disabledFeatures: [] as string[],
};

test.describe('nav search', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    // Delete first so a leftover space from an interrupted prior run doesn't
    // fail creation with a 409 conflict.
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
    await apiServices.spaces.create(SPACE);
    await apiServices.spaces.setSolutionView({ id: SPACE.id, solution: 'es' });
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
  });

  test('opens search and selects a result', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.app('home', { space: SPACE.id }));

    await page.testSubj
      .locator('chromeNextGlobalHeaderSearchButton')
      .or(page.testSubj.locator('nav-search-reveal'))
      .click();
    await page.testSubj.fill('nav-search-input', 'dashboards');
    await page
      .locator(`[data-test-subj="nav-search-option"][url="/s/${SPACE.id}/app/dashboards"]`)
      .click();

    await page.waitForURL(/app\/dashboards/);
    expect(page.url()).toContain('app/dashboards');
  });
});
