/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover unsaved changes modal on leaving the app',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'shows the modal when the session is saved and has unsaved changes',
      async ({ page, pageObjects, scoutSpace }) => {
        const savedSearch = `saved-search-dirty-${scoutSpace.id}`;
        await pageObjects.discover.saveSearch(savedSearch);
        await pageObjects.discover.waitUntilTabIsLoaded();

        await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
        await pageObjects.discover.waitUntilTabIsLoaded();

        await pageObjects.collapsibleNav.clickItem('Dashboards');

        await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeVisible();
      }
    );

    spaceTest(
      'does not show the modal when the session is saved and has no unsaved changes',
      async ({ page, pageObjects, scoutSpace }) => {
        const savedSearch = `saved-search-clean-${scoutSpace.id}`;
        await pageObjects.discover.saveSearch(savedSearch);
        await pageObjects.discover.waitUntilTabIsLoaded();

        await pageObjects.collapsibleNav.clickItem('Dashboards');

        await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeHidden();
      }
    );

    spaceTest(
      'does not show the modal when the session is not saved and has unsaved changes',
      async ({ page, pageObjects }) => {
        await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
        await pageObjects.discover.waitUntilTabIsLoaded();

        await pageObjects.collapsibleNav.clickItem('Dashboards');

        await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeHidden();
      }
    );

    spaceTest(
      'does not show the modal when the session is not saved and has no unsaved changes',
      async ({ page, pageObjects }) => {
        await pageObjects.collapsibleNav.clickItem('Dashboards');

        await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeHidden();
      }
    );
  }
);
