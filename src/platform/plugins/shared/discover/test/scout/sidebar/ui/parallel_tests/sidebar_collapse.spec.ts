/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe('Discover sidebar collapse', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('collapses and expands the field list sidebar', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    await spaceTest.step('sidebar starts expanded', async () => {
      await expect(page.testSubj.locator('discover-sidebar')).toBeVisible();
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      expect(await discover.isSidebarPanelOpen()).toBe(true);
    });

    await spaceTest.step('collapses when hidden', async () => {
      await discover.closeSidebar();
      await expect(page.testSubj.locator('dscShowSidebarButton')).toBeVisible();
      await expect(page.testSubj.locator('fieldList')).toBeHidden();
      expect(await discover.isSidebarPanelOpen()).toBe(false);
    });

    await spaceTest.step('expands when shown again', async () => {
      await discover.openSidebar();
      await expect(page.testSubj.locator('discover-sidebar')).toBeVisible();
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      expect(await discover.isSidebarPanelOpen()).toBe(true);
    });
  });
});
