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
import { spaceTest } from '../fixtures';

spaceTest.describe('Discover drag and drop', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
  });

  spaceTest.afterEach(async ({ page }) => {
    await page.evaluate(() =>
      window.localStorage.setItem('discover.unifiedFieldList.initiallyOpenSections', '{}')
    );
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'should support dragging and dropping a field onto the grid',
    async ({ page, pageObjects }) => {
      // Stable after waitUntilSidebarHasLoaded() in beforeEach
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual(['@timestamp', 'Summary']);

      await pageObjects.discover.dragFieldToGrid(['extension']);

      // Wait for the new column header before asserting the full set
      await page.testSubj.locator('dataGridHeaderCell-extension').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual(['@timestamp', 'extension']);

      await pageObjects.discover.waitUntilSearchingHasFinished();

      expect(
        await pageObjects.unifiedFieldList.getSidebarSectionFieldNames('selected')
      ).toStrictEqual(['extension']);
    }
  );

  spaceTest(
    'should support dragging and dropping a field onto the grid (with keyboard)',
    async ({ page, pageObjects }) => {
      await expect
        .poll(() => pageObjects.discover.getDocHeader())
        .toStrictEqual(['@timestamp', 'Summary']);

      await pageObjects.discover.dragFieldToGridWithKeyboard('@message');

      // Wait for the new column header before asserting the full set
      await page.testSubj.locator('dataGridHeaderCell-@message').waitFor({ state: 'visible' });
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual(['@timestamp', '@message']);

      await pageObjects.discover.waitUntilSearchingHasFinished();

      expect(
        await pageObjects.unifiedFieldList.getSidebarSectionFieldNames('selected')
      ).toStrictEqual(['@message']);
    }
  );
});
