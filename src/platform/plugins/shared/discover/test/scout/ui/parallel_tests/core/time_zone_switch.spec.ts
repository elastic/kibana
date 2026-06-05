/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover: changing the `dateFormat:tz` UI setting shifts the displayed
 * timestamps by the correct offset. Migrated from the "time zone switch"
 * describe in `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 *
 * UTC default would render the newest doc at `Sep 22, 2015 @ 23:50:13.253`;
 * `America/Phoenix` is UTC-7 with no DST, so the same timestamp shifts to
 * `Sep 22, 2015 @ 16:50:13.253`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const EXPECTED_FIRST_ROW_PHOENIX = 'Sep 22, 2015 @ 16:50:13.253';

spaceTest.describe('Discover - time zone switch', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'America/Phoenix' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults', 'dateFormat:tz');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shifts displayed timestamps by the UTC offset', async ({ pageObjects }) => {
    await expect
      .poll(() => pageObjects.discover.getDocTableField(1), { timeout: 10_000 })
      .toContain(EXPECTED_FIRST_ROW_PHOENIX);
  });
});
