/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Add, sort, and remove Discover columns — including a field with a custom label.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe('fields', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'adds, sorts, and removes the score field from the URL',
    async ({ page, pageObjects }) => {
      const { dataGrid, discover, unifiedFieldList } = pageObjects;

      await unifiedFieldList.clickFieldListItemAdd('_score');
      await discover.waitUntilTabIsLoaded();
      await dataGrid.sortColumn('_score', 'Sort Low-High');
      await discover.waitUntilTabIsLoaded();
      await expect(page).toHaveURL(/_score/);

      await unifiedFieldList.clickFieldListItemRemove('_score');
      await discover.waitUntilTabIsLoaded();
      await expect(page).not.toHaveURL(/_score/);
    }
  );

  spaceTest(
    'displays a custom field label in the grid and sidebar',
    async ({ page, pageObjects }) => {
      const { dataGrid, discover, unifiedFieldList } = pageObjects;

      await unifiedFieldList.clickFieldListItemAdd('referer');
      await discover.waitUntilTabIsLoaded();
      await dataGrid.sortColumn('referer', 'Sort A-Z');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getDocHeader()).toContain('Referer custom');
      expect(await unifiedFieldList.getAllFieldNames()).toContain('Referer custom');
      await expect(page).toHaveURL(/referer/);
    }
  );
});
