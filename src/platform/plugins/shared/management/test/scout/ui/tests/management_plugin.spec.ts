/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Exercises the management app's registration and routing contract against real
// shipped sections instead of a synthetic --plugin-path test plugin, which rspack
// does not build browser bundles for. A registered section mounts from the
// sidebar, routes within itself via the scoped history it receives from mount(),
// and browser history returns to the landing page; a section whose owning feature
// is disabled in a space redirects to the landing page.
//
// Index Management stands in for the test plugin's in-app routing: its header tabs
// call `history.push('/<section>')` on the section's own scoped history, the same
// contract the original test asserted with a synthetic basePath-prefixed link.
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

  test('mounts a registered section and routes within it', async ({ page, pageObjects }) => {
    await pageObjects.management.goto();

    await test.step('open a registered section from the management sidebar', async () => {
      await page.testSubj.locator('index_management').click();

      // Assert the section app actually mounted, not just that the URL changed.
      await expect(page.testSubj.locator('indicesTab')).toBeVisible();
      await expect(page).toHaveURL(/\/app\/management\/data\/index_management\/indices(?:[?#/]|$)/);
    });

    await test.step('navigate within the section via its scoped history', async () => {
      // The tab click is an in-app `history.push` on the section's own history,
      // not a full navigation — the URL changes client-side and the app stays
      // mounted, which is what the original test's basePath link proved.
      await page.testSubj.locator('templatesTab').click();

      await expect(page).toHaveURL(
        /\/app\/management\/data\/index_management\/templates(?:[?#/]|$)/
      );
      await expect(page.testSubj.locator('templateList')).toBeVisible();
    });

    await test.step('return to the management landing page', async () => {
      // Two back steps: templates -> indices (in-app) -> management landing.
      await page.goBack();
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
