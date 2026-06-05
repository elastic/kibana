/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover unsaved-changes indicator: revert flows for column / sample-size
 * / rows-per-page edits. Migrated from the "should allow to revert changes"
 * test in
 * `src/platform/test/functional/apps/discover/group12/_unsaved_changes_notification_indicator.ts`.
 *
 * Each section here was its own logical phase in the FTR test (column edits,
 * sample size, rows per page); they share the same loaded saved search but
 * each phase is an independent journey.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH_NAME = 'test saved search';

spaceTest.describe('Discover - unsaved changes (revert)', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('reverts column / sample-size / rows-per-page edits', async ({ pageObjects }) => {
    // Pre-create the saved search this journey reverts changes against,
    // including a `bytes` column so the header has something to compare.
    await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.saveSearch(SAVED_SEARCH_NAME);
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await spaceTest.step('reverts a column added after load', async () => {
      await pageObjects.discover.goto();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();

      expect(await pageObjects.dataGrid.getHeaderFields()).toStrictEqual(['@timestamp', 'bytes']);
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.dataGrid.getHeaderFields()).toStrictEqual([
        '@timestamp',
        'bytes',
        'extension',
      ]);
      await pageObjects.discover.ensureHasUnsavedChangesIndicator();

      await pageObjects.discover.revertUnsavedChanges();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.dataGrid.getHeaderFields()).toStrictEqual(['@timestamp', 'bytes']);
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();
    });

    await spaceTest.step('reverts a sample-size change', async () => {
      await pageObjects.dataGrid.clickGridSettings();
      expect(await pageObjects.dataGrid.getCurrentSampleSizeValue()).toBe(500);
      await pageObjects.dataGrid.changeSampleSizeValue(250);
      // Close popover to flush the change to the URL/state.
      await pageObjects.dataGrid.clickGridSettings();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureHasUnsavedChangesIndicator();

      await pageObjects.dataGrid.clickGridSettings();
      expect(await pageObjects.dataGrid.getCurrentSampleSizeValue()).toBe(250);
      await pageObjects.dataGrid.clickGridSettings();

      await pageObjects.discover.revertUnsavedChanges();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();
      await pageObjects.dataGrid.clickGridSettings();
      expect(await pageObjects.dataGrid.getCurrentSampleSizeValue()).toBe(500);
      await pageObjects.dataGrid.clickGridSettings();
    });

    await spaceTest.step('reverts a rows-per-page change', async () => {
      await pageObjects.dataGrid.checkCurrentRowsPerPageToBe(100);
      await pageObjects.dataGrid.changeRowsPerPageTo(25);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureHasUnsavedChangesIndicator();
      await pageObjects.dataGrid.checkCurrentRowsPerPageToBe(25);

      await pageObjects.discover.revertUnsavedChanges();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();
      await pageObjects.dataGrid.checkCurrentRowsPerPageToBe(100);
    });
  });
});
