/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Exercises the management app's registration and routing contract against a real
// shipped section instead of a synthetic --plugin-path test plugin, which rspack
// does not build browser bundles for. This asserts only what the management
// framework owns: a registered section opens from the sidebar into its own route,
// browser history returns to the landing page, and a section whose owning feature
// is disabled in a space redirects to the landing page. Routing *within* a section
// (the scoped history a section receives from mount()) is that section's own
// contract — Index Management covers it in
// x-pack/.../index_management/test/scout/ui/tests/home_page.spec.ts.
//
// FTR source: src/platform/test/plugin_functional/test_suites/management/management_plugin.ts

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Management plugin routing', { tag: tags.stateful.classic }, () => {
  // Space with a management section's owning feature disabled, for the redirect test.
  let disabledSectionSpaceId: string;

  test.beforeAll(async ({ apiServices }, workerInfo) => {
    disabledSectionSpaceId = `management-disabled-section-${
      workerInfo.parallelIndex
    }-${Date.now()}`;
    await apiServices.spaces.create({
      id: disabledSectionSpaceId,
      name: disabledSectionSpaceId,
      disabledFeatures: ['savedObjectsManagement'],
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(disabledSectionSpaceId);
  });

  test('opens a registered section from the sidebar and returns home', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.management.goto();

    await test.step('open a registered section from the management sidebar', async () => {
      await page.testSubj.locator('index_management').click();

      // Management owns the routing, not the section content: assert the section
      // route without reaching into the section's internal DOM.
      await expect(page).toHaveURL(/\/app\/management\/data\/index_management(?:[?#/]|$)/);
    });

    await test.step('return to the management landing page', async () => {
      await page.goBack();

      await expect(page.testSubj.locator('managementHome')).toBeVisible();
    });
  });

  test('redirects to management home when navigating to a disabled management section', async ({
    page,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.app('management/kibana/objects', { space: disabledSectionSpaceId }));

    await expect(page.testSubj.locator('managementHome')).toBeVisible();
  });
});
