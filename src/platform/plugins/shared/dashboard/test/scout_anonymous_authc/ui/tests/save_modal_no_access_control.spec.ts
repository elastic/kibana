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

test.describe(
  'dashboard save modal - no access control for anonymous user',
  { tag: tags.stateful.classic },
  () => {
    let capturedRequestBody: Record<string, unknown> | null = null;
    let dataViewId: string;

    test.beforeAll(async ({ kbnClient }) => {
      // Create a data view so the dashboard editor loads properly
      // instead of showing the "Add integrations" no-data page.
      const response = await kbnClient.request<{ data_view: { id: string } }>({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: {
          data_view: {
            title: 'anon-test-*',
            name: 'Anon Test Data View',
            allowNoIndex: true,
          },
        },
      });
      dataViewId = response.data.data_view.id;
    });

    test.beforeEach(async ({ page }) => {
      capturedRequestBody = null;
      // Navigate directly to the create dashboard page to bypass the
      // listing page (which may redirect to the no-data prompt).
      await page.gotoApp('dashboards', { hash: '/create' });
      await page.waitForLoadingIndicatorHidden();
    });

    test.afterAll(async ({ kbnClient }) => {
      // Clean up the data view
      if (dataViewId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/data_views/data_view/${dataViewId}`,
        });
      }
    });

    test('save modal does not show access control and request omits access_control', async ({
      page,
    }) => {
      // Intercept the POST to /internal/dashboards/app to capture the request body
      await page.route('**/internal/dashboards/app*', async (route) => {
        const request = route.request();
        if (request.method() === 'POST') {
          capturedRequestBody = request.postDataJSON();
        }
        await route.continue();
      });

      // Open save modal
      await page.testSubj.click('dashboardInteractiveSaveMenuItem');

      // Verify the access mode container is NOT visible
      await expect(page.testSubj.locator('accessModeContainer')).toHaveCount(0);

      // Fill in the dashboard title and save
      await page.testSubj.locator('savedObjectTitle').fill('Anon Auth Dashboard Test');
      await page.testSubj.click('confirmSaveSavedObjectButton');

      // Wait for the save to complete (confirm button should disappear)
      await expect(page.testSubj.locator('confirmSaveSavedObjectButton')).toBeHidden();

      // Verify the request body does not contain access_control
      expect(capturedRequestBody).not.toBeNull();
      expect(capturedRequestBody).not.toHaveProperty('access_control');

      // Cleanup route interception
      await page.unroute('**/internal/dashboards/app*');
    });
  }
);
