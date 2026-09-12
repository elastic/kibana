/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Kibana Home page role-based visibility of solution cards and the Manage section.

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

test.describe('Home page — feature controls', { tag: tags.stateful.classic }, () => {
  test('global:all sees every solution panel and the Manage section', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_all);

    await test.step('navigate to the Home app', async () => {
      await pageObjects.home.goto();
    });

    await test.step('shows all registered solutions', async () => {
      const solutions = await pageObjects.home.getVisibleSolutions();
      expect(solutions).toStrictEqual([
        'enterpriseSearch',
        'observability',
        'securitySolution',
        'kibana',
      ]);
    });

    await test.step('shows the Manage section and Stack Management quick-link', async () => {
      await expect(pageObjects.home.manageSection).toBeVisible();
      await expect(pageObjects.home.stackManagementButton).toBeVisible();
    });
  });

  test('dashboard:all sees only the Kibana solution and no Manage section', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_dashboard_all);

    await test.step('navigate to the Home app', async () => {
      await pageObjects.home.goto();
    });

    await test.step('shows only the Kibana solution', async () => {
      const solutions = await pageObjects.home.getVisibleSolutions();
      expect(solutions).toStrictEqual(['kibana']);
    });

    await test.step('hides the Manage section and Stack Management quick-link', async () => {
      await expect(pageObjects.home.manageSection).toBeHidden();
      await expect(pageObjects.home.stackManagementButton).toBeHidden();
    });
  });
});
