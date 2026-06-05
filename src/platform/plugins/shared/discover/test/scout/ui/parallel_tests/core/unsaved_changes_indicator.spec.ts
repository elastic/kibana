/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover unsaved-changes notification indicator: the badge on the save
 * button should appear only after edits to a *persisted* saved search.
 * Migrated (partially) from
 * `src/platform/test/functional/apps/discover/group12/_unsaved_changes_notification_indicator.ts`.
 *
 * This file covers the column / breakdown / save / load flows. Filter-pin
 * /negate, sample-size, rows-per-page and ES|QL paths are deferred until
 * the corresponding `DataGrid` and `FilterBar` Scout page objects pick up
 * the FTR helpers they rely on.
 */

import { spaceTest, tags } from '@kbn/scout';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH_NAME = 'test saved search';

spaceTest.describe('Discover - unsaved changes indicator', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Privileged user is needed to save the search used in the persisted-edit
    // and load-then-edit cases.
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'never shows the indicator while the search is still a draft',
    async ({ pageObjects }) => {
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();

      // Draft edit: adding a column should NOT raise the indicator because
      // the search has never been persisted.
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.ensureNoUnsavedChangesIndicator();
    }
  );

  spaceTest(
    'shows the indicator only after editing a persisted saved search and clears on save',
    async ({ pageObjects }) => {
      await pageObjects.discover.saveSearch(SAVED_SEARCH_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();

      // First edit on a persisted search → indicator appears.
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureHasUnsavedChangesIndicator();

      // Persisting the change should clear the indicator again.
      await pageObjects.discover.saveUnsavedChanges();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();
    }
  );

  spaceTest(
    'loading a saved search starts clean and only flips after edits',
    async ({ pageObjects }) => {
      // Pre-create the saved search this test loads.
      await pageObjects.discover.saveSearch(SAVED_SEARCH_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();

      // Reset to a fresh page so the load path is exercised, not the
      // immediately-after-save path.
      await pageObjects.discover.goto();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();

      // A breakdown change is enough to flip the indicator.
      await pageObjects.discover.chooseBreakdownField('_index');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureHasUnsavedChangesIndicator();

      // …and reverting puts us back to clean.
      await pageObjects.discover.clearBreakdownField();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();
    }
  );
});
