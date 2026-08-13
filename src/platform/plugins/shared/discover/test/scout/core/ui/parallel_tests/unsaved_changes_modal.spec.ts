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
  'Discover unsaved changes modal',
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

    spaceTest.describe('when the user leaves the discover app', () => {
      spaceTest.describe('when the session is saved', () => {
        spaceTest(
          'should show the unsaved changes modal when there are unsaved changes',
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
          'should not show the unsaved changes modal when there are no unsaved changes',
          async ({ page, pageObjects, scoutSpace }) => {
            const savedSearch = `saved-search-clean-${scoutSpace.id}`;
            await pageObjects.discover.saveSearch(savedSearch);
            await pageObjects.discover.waitUntilTabIsLoaded();

            await pageObjects.collapsibleNav.clickItem('Dashboards');

            await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeHidden();
          }
        );
      });

      spaceTest.describe('when the session is not saved', () => {
        spaceTest(
          'should not show the unsaved changes modal when there are unsaved changes',
          async ({ page, pageObjects }) => {
            await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
            await pageObjects.discover.waitUntilTabIsLoaded();

            await pageObjects.collapsibleNav.clickItem('Dashboards');

            await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeHidden();
          }
        );

        spaceTest(
          'should not show the unsaved changes modal when there are no unsaved changes',
          async ({ page, pageObjects }) => {
            await pageObjects.collapsibleNav.clickItem('Dashboards');

            await expect(page.testSubj.locator('appLeaveConfirmModal')).toBeHidden();
          }
        );
      });
    });
  }
);
