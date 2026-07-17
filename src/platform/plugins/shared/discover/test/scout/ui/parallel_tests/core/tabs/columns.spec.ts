/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const SELECTED_COLUMNS = ['extension', 'bytes'];

spaceTest.describe('Discover tabs - columns', { tag: '@local-stateful-classic' }, () => {
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

  spaceTest(
    'carries over selected columns when switching to ES|QL mode',
    async ({ pageObjects }) => {
      const { dataGrid, discover } = pageObjects;

      for (const column of SELECTED_COLUMNS) {
        await dataGrid.addFieldFromSidebar(column);
      }

      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      for (const column of SELECTED_COLUMNS) {
        await expect(dataGrid.getColumnHeader(column)).toBeVisible();
      }

      await discover.searchFieldInSidebar('');
      await discover.expectSelectedSidebarFieldsToEqual(SELECTED_COLUMNS);
    }
  );
});
