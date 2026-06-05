/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover empty-time-range query: verifies the no-results panel, the
 * time-range suggestion link, and the "expand time range" recovery flow.
 * Migrated from the "query #2, which has an empty time range" describe in
 * `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const EMPTY_RANGE_FROM = 'Jun 11, 1999 @ 09:22:11.000';
const EMPTY_RANGE_TO = 'Jun 12, 1999 @ 11:21:04.000';

spaceTest.describe('Discover - empty time range', { tag: tags.stateful.all }, () => {
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
    // Set a known-empty absolute range (1999) so the no-results panel renders.
    await pageObjects.datePicker.setAbsoluteRange({
      from: EMPTY_RANGE_FROM,
      to: EMPTY_RANGE_TO,
    });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows the no-results panel', async ({ pageObjects }) => {
    expect(await pageObjects.discover.hasNoResults()).toBe(true);
  });

  spaceTest('suggests a new time range can be picked', async ({ pageObjects }) => {
    expect(await pageObjects.discover.hasNoResultsTimepicker()).toBe(true);
  });

  spaceTest('shows matches once the time range is expanded', async ({ pageObjects }) => {
    await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();
    expect(await pageObjects.discover.hasNoResults()).toBe(false);
    expect(await pageObjects.discover.getHitCountInt()).toBeGreaterThan(0);
  });
});
