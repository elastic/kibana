/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../fixtures';

test.describe('Workflows UI availability', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test(
    'stateful: workflows list page renders when license is valid',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeHidden();
    }
  );

  test(
    'stateful: workflows list page renders when using basic (invalid) license',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await page.route('**/api/licensing/info', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            license: {
              uid: 'basic-license-test',
              type: 'basic',
              mode: 'basic',
              expiryDateInMillis: 4884310543000,
              status: 'active',
            },
            signature: 'basic-license-signature',
          }),
        })
      );

      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsLicenseAccessDenied')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeVisible();
      await expect(page.testSubj.locator('workflowsPage')).toBeHidden();
    }
  );

  test(
    'observability complete: workflows list page renders',
    { tag: [...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeHidden();
    }
  );

  test(
    'security complete: workflows list page renders',
    { tag: [...tags.serverless.security.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeHidden();
    }
  );

  test(
    'security EASE (AI for SOC): workflows list page renders',
    { tag: [...tags.serverless.security.ease] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeHidden();
    }
  );

  test(
    'search: workflows list page renders',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeHidden();
    }
  );

  test(
    'observability logs essentials: shows serverless tier access denied screen',
    { tag: [...tags.serverless.observability.logs_essentials] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsServerlessTierAccessDenied')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeVisible();
      await expect(page.testSubj.locator('workflowsPage')).toBeHidden();
    }
  );

  test(
    'security essentials: shows serverless tier access denied screen',
    { tag: [...tags.serverless.security.essentials] },
    async ({ page, pageObjects }) => {
      await pageObjects.workflowList.navigate();
      await expect(page.testSubj.locator('workflowsServerlessTierAccessDenied')).toBeVisible();
      await expect(page.testSubj.locator('workflowsAccessDeniedEmptyState')).toBeVisible();
      await expect(page.testSubj.locator('workflowsPage')).toBeHidden();
    }
  );
});
