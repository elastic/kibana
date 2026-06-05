/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover unsaved-changes indicator: pinning a filter is *not* a persisted
 * edit (filters are pinned globally), but negating a filter *is*. Migrated
 * from the "should not show…after pinning…but after disabling" test in
 * `src/platform/test/functional/apps/discover/group12/_unsaved_changes_notification_indicator.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH_WITH_FILTERS_NAME = 'test saved search with filters';
const EXPECTED_HIT_COUNT_AFTER_REVERT = '1,373';

spaceTest.describe(
  'Discover - unsaved changes (filter pin / negate)',
  { tag: tags.stateful.all },
  () => {
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

    spaceTest('pinning is not an unsaved change but negating is', async ({ pageObjects }) => {
      await pageObjects.filterBar.addFilter({
        field: 'extension',
        operator: 'is',
        value: 'png',
      });
      await pageObjects.filterBar.addFilter({
        field: 'bytes',
        operator: 'exists',
      });
      await pageObjects.discover.saveSearch(SAVED_SEARCH_WITH_FILTERS_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.ensureNoUnsavedChangesIndicator();

      await spaceTest.step('pinning a filter does not flip the indicator', async () => {
        await pageObjects.filterBar.toggleFilterPinned('extension');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        expect(await pageObjects.filterBar.isFilterPinned('extension')).toBe(true);
        await pageObjects.discover.ensureNoUnsavedChangesIndicator();
      });

      await spaceTest.step('negating a filter does flip the indicator', async () => {
        await pageObjects.filterBar.toggleFilterNegated('bytes');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        expect(await pageObjects.filterBar.isFilterNegated('bytes')).toBe(true);
        await pageObjects.discover.ensureHasUnsavedChangesIndicator();
      });

      await spaceTest.step(
        'reverting drops the negate but keeps the count and clears pin',
        async () => {
          await pageObjects.discover.revertUnsavedChanges();
          await pageObjects.discover.ensureNoUnsavedChangesIndicator();

          expect(await pageObjects.filterBar.getFilterCount()).toBe(2);
          expect(await pageObjects.filterBar.isFilterPinned('extension')).toBe(false);
          expect(await pageObjects.filterBar.isFilterNegated('bytes')).toBe(false);
          await expect(pageObjects.discover.hitCountLocator()).toHaveText(
            EXPECTED_HIT_COUNT_AFTER_REVERT,
            { timeout: 30_000 }
          );
        }
      );
    });
  }
);
