/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Wait for Discover to finish loading: give the `discoverDataGridUpdating`
 * indicator a brief window to appear, then wait for it to disappear.
 *
 * The two-step pattern avoids a race where `waitForSelector({ state: 'hidden' })`
 * resolves immediately because the indicator hasn't yet been rendered. Without
 * the short "visible" grace window, this helper would return before the search
 * request is even issued — making request-count assertions read 0.
 */
export const waitForDiscoverToSettle = async (page: ScoutPage) => {
  try {
    await page.testSubj.waitForSelector('discoverDataGridUpdating', {
      state: 'visible',
      timeout: 2_000,
    });
  } catch {
    // Indicator never appeared — assume nothing was in flight.
  }
  await page.testSubj.waitForSelector('discoverDataGridUpdating', {
    state: 'hidden',
    timeout: 30_000,
  });
};

/**
 * Click the histogram breakdown selector and pick `field` (or `"No breakdown"`).
 *
 * Not part of Scout's shared `DiscoverApp` page object yet; kept here so any
 * Discover spec can reuse it. Promote once a second stable consumer appears.
 */
export const chooseBreakdownField = async (page: ScoutPage, field: string) => {
  await page.testSubj.click('unifiedHistogramBreakdownSelectorButton');
  await page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
    state: 'visible',
  });
  await page.testSubj.fill('unifiedHistogramBreakdownSelectorSelectorSearch', field);
  await page
    .locator(
      `[data-test-subj="unifiedHistogramBreakdownSelectorSelectable"] .euiSelectableListItem[value="${field}"]`
    )
    .click();
  await page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
    state: 'hidden',
  });
};

/**
 * Pick a histogram chart interval (e.g. `"Day"`). See note on `chooseBreakdownField`.
 */
export const setChartInterval = async (page: ScoutPage, intervalTitle: string) => {
  await page.testSubj.click('unifiedHistogramTimeIntervalSelectorButton');
  await page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
    state: 'visible',
  });
  await page
    .locator(
      `[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"] .euiSelectableListItem[title="${intervalTitle}"]`
    )
    .click();
  await page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
    state: 'hidden',
  });
};
