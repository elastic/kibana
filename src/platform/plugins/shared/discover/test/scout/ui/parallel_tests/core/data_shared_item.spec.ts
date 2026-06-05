/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * After loading a saved search, Discover should expose its title and
 * description through `data-shared-item` attributes so it can be embedded.
 * Migrated from the "data-shared-item" describe in
 * `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH = {
  title: 'A Saved Search',
  description: 'A Saved Search Description',
};

spaceTest.describe('Discover - data-shared-item', { tag: tags.stateful.all }, () => {
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

  spaceTest('exposes title and description via data-shared-item', async ({ page, pageObjects }) => {
    await pageObjects.discover.loadSavedSearch(SAVED_SEARCH.title);
    await pageObjects.discover.waitUntilSearchingHasFinished();

    // The dashboard/embeddable serializer reads these attributes from the
    // shared-item wrapper; there is exactly one such element on the page.
    const shared = page.locator('[data-shared-item][data-title][data-description]');
    await expect(shared).toHaveAttribute('data-title', SAVED_SEARCH.title);
    await expect(shared).toHaveAttribute('data-description', SAVED_SEARCH.description);
  });
});
