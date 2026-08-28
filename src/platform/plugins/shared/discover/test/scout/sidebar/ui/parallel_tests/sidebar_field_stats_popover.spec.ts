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
  'Discover sidebar field stats popover',
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

    spaceTest('shows top values for a keyword field', async ({ page, pageObjects }) => {
      const { unifiedFieldList } = pageObjects;

      await unifiedFieldList.clickFieldListItem('extension');

      await expect(unifiedFieldList.getFieldStatsTopValues()).toBeVisible();
      await expect(unifiedFieldList.getFieldStatsTitle()).toContainText('Top values');
      await expect(unifiedFieldList.getFieldStatsFooter()).toContainText('records');
      await expect(page.testSubj.locator('dscFieldStats-topValues-bucket')).not.toHaveCount(0);
    });
  }
);
