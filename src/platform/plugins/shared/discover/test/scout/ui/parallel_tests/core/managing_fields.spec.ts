/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Managing sidebar fields in Discover: adding/removing a column, sorting on
 * it, and respecting the data view's `customLabel`. Migrated from the
 * "managing fields" describe in
 * `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover - managing fields', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'adds a field, sorts by it, removes it and clears the sort',
    async ({ page, pageObjects }) => {
      // `_score` lives in the Meta section (collapsed by default); the helper
      // expands it on demand.
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('_score');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.clickFieldSort('_score', 'Sort Low-High');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      // URL state should reflect the new column + sort.
      await expect.poll(() => page.url(), { timeout: 10_000 }).toContain('_score');

      await pageObjects.unifiedFieldList.clickFieldListItemRemove('_score');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      // After removal both the column and the sort on it should be gone from
      // the URL.
      await expect.poll(() => page.url(), { timeout: 10_000 }).not.toContain('_score');
    }
  );

  spaceTest(
    'displays a field with a customLabel from the data view',
    async ({ page, pageObjects }) => {
      // The `logstash-*` data view in the discover archive renames `referer`
      // to "Referer custom" via `customLabel`.
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('referer');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.clickFieldSort('referer', 'Sort A-Z');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      expect(await pageObjects.discover.getDocHeader()).toContain('Referer custom');
      expect(await pageObjects.unifiedFieldList.getAllFieldNames()).toContain('Referer custom');

      await expect.poll(() => page.url(), { timeout: 10_000 }).toContain('referer');
    }
  );
});
