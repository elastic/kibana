/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover histogram brush + data-view-switch coverage, migrated from the
 * first two `it`s of `_discover_histogram.ts`. Brushing is a canvas
 * mouse-drag, and the time-range it selects is sensitive to the histogram
 * width, so we keep the FTR's offsets and tolerance.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { LONG_WINDOW_LOGSTASH_KBN_ARCHIVE, LONG_WINDOW_LOGSTASH_DATA_VIEW } = testData;

spaceTest.describe('Discover - histogram brush', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LONG_WINDOW_LOGSTASH_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'Europe/Berlin' });
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

  spaceTest('brushing the histogram narrows the time range', async ({ pageObjects }) => {
    // Capture the first row before brushing so the assertion is robust to
    // whatever timestamp the dataset happens to start with.
    const before = await pageObjects.discover.getDocTableField(1);

    await pageObjects.discover.brushHistogram();
    await pageObjects.discover.waitUntilSearchingHasFinished();

    const durationHours = await pageObjects.datePicker.getTimeDurationInHours();
    // FTR rounds to ~23h; allow ±2h to absorb canvas-width pixel drift on
    // CI vs. local. The FTR comment notes "might fail if histogram's width changes".
    expect(Math.round(durationHours)).toBeGreaterThanOrEqual(20);
    expect(Math.round(durationHours)).toBeLessThanOrEqual(26);

    await expect
      .poll(() => pageObjects.discover.getDocTableField(1), { timeout: 10_000 })
      .not.toBe(before);
  });

  spaceTest(
    'switching data views and brushing produces the expected hit count',
    async ({ pageObjects }) => {
      await pageObjects.discover.selectIndexPattern('logstash-*');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectIndexPattern(LONG_WINDOW_LOGSTASH_DATA_VIEW);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.brushHistogram();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await expect(pageObjects.discover.hitCountLocator()).toHaveText('7', { timeout: 30_000 });
    }
  );
});
