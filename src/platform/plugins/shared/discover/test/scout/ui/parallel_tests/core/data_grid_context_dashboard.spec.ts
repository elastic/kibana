/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '@kbn/scout';
import { testData } from '../../fixtures/common';

spaceTest.describe(
  'Discover data grid - dashboard context view',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.setQueryMode('classic');
      await pageObjects.discover.goto();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForDocTableRendered();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(
        'defaultIndex',
        'timepicker:timeDefaults',
        'discover:rowHeightOption'
      );
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'navigates to context view from a saved-search dashboard panel',
      async ({ page, pageObjects, scoutSpace }) => {
        const searchName = `context search ${scoutSpace.id}`;

        await pageObjects.filterBar.addFilter({
          field: 'extension.raw',
          operator: 'is',
          value: 'jpg',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.saveSearch(searchName);

        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.addSavedSearch(searchName);
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        page.once('dialog', (dialog) => dialog.accept());
        await pageObjects.discover.openSurroundingDocuments(0);
        await page.testSubj.locator('confirmModalConfirmButton').click();

        await expect(page).toHaveURL(/#\/context/);
        await pageObjects.discover.waitForDocTableRendered();
        await expect
          .poll(() =>
            page
              .locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]')
              .evaluateAll(
                (rows) => new Set(rows.map((row) => row.getAttribute('data-grid-row-index'))).size
              )
          )
          .toBe(6);
      }
    );
  }
);
