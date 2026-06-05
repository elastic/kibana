/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover URL state - Lens sync: filters / time range applied in Lens are
 * carried over to Discover via the global `_g` state in the chrome nav link.
 * Migrated from the "should sync Lens global state to Discover sidebar link
 * …" test in `src/platform/test/functional/apps/discover/group5/_url_state.ts`.
 *
 * The original FTR test asserts on the exact URL hash of the Discover link
 * in the chrome nav. That assertion is extremely brittle (it depends on
 * rison-encoded ordering of refresh-interval, time, filters …). We assert
 * the user-observable behavior instead: clicking the Discover link from
 * Lens restores the same pinned filter, time range, and hit count.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { DEFAULT_TIME_RANGE_DISPLAY } = testData;
const EXPECTED_HIT_COUNT = '11,268';

spaceTest.describe('Discover - URL state Lens sync', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'pinned filter + time set in Lens carries over to Discover',
    async ({ kbnUrl, page, pageObjects }) => {
      // Open Lens first; the filter and time set here go into the global
      // state that the chrome's Discover deep link picks up.
      await page.goto(kbnUrl.app('lens'));
      await pageObjects.lens.waitForLensApp();

      await pageObjects.datePicker.setAbsoluteRange({
        from: DEFAULT_TIME_RANGE_DISPLAY.start,
        to: DEFAULT_TIME_RANGE_DISPLAY.end,
      });
      await pageObjects.filterBar.addFilter({
        field: 'extension.raw',
        operator: 'is one of',
        value: ['jpg', 'css'],
      });
      await pageObjects.filterBar.toggleFilterPinned('extension.raw');

      // Navigate to Discover via the chrome nav (the same path the FTR
      // exercises). The pinned filter, time, and resulting hit count must
      // all round-trip.
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('discover');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      expect(
        await pageObjects.filterBar.hasFilter({
          field: 'extension.raw',
          // Multi-value (`is one of`) filters serialize their value into a
          // composite `filter-value-` test-subj that's awkward to match
          // exactly; assert on field + pinned only, the same pattern the
          // FTR uses.
          pinned: true,
        })
      ).toBe(true);
      const time = await pageObjects.datePicker.getTimeConfig();
      expect(time.start).toBe(DEFAULT_TIME_RANGE_DISPLAY.start);
      expect(time.end).toBe(DEFAULT_TIME_RANGE_DISPLAY.end);
      await expect(pageObjects.discover.hitCountLocator()).toHaveText(EXPECTED_HIT_COUNT, {
        timeout: 30_000,
      });
    }
  );
});
