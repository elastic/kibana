/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

/**
 * Cross-app smoke: the popover renders inside the app shell for Dashboard,
 * Maps and Visualize. The popover behaviour itself is covered by the CRUD and
 * read-only specs in Discover; this guards against an app changing its top-nav
 * layout in a way that hides the menu trigger.
 *
 * Custom-role auth is local-stateful only (no ECH support yet for `loginWithCustomRole`).
 */
spaceTest.describe('Saved query menu — cross-app smoke', { tag: testData.SQM_UI_TAG }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.SAVED_QUERY_BUNDLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.ALL_APPS_SQM_ALL_ROLE);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('popover renders in dashboard, maps and visualize', async ({ pageObjects }) => {
    const { savedQueryManagementMenu: menu, dashboard, maps, visualize } = pageObjects;

    const expectPopoverIsRendered = async () => {
      await menu.open();
      await expect(menu.saveButton).toBeVisible();
      await expect(menu.loadButton).toBeVisible();
      await menu.close();
    };

    await spaceTest.step('dashboard', async () => {
      // The query bar only exists inside an opened dashboard, not on the listing.
      await dashboard.openNewDashboard();
      await expectPopoverIsRendered();
    });

    await spaceTest.step('maps', async () => {
      await maps.gotoNewMap();
      await expectPopoverIsRendered();
    });

    await spaceTest.step('visualize', async () => {
      // The query bar lives in the Lens editor, not on the visualize listing.
      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await expectPopoverIsRendered();
    });
  });
});
