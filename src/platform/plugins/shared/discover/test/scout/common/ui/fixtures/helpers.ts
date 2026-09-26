/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, ScoutTestFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DISCOVER_QUERY_MODE_KEY } from '../../../../../common/constants';
import * as testData from './constants';

export type QueryMode = 'classic' | 'esql';

export const getSearchSourceRuleParams = (
  dataView: string | Record<string, unknown>,
  query = '',
  filter: Array<Record<string, unknown>> = []
) => ({
  searchType: 'searchSource',
  timeWindowSize: 30,
  timeWindowUnit: 'm',
  threshold: [1],
  thresholdComparator: '>',
  size: 100,
  aggType: 'count',
  groupBy: 'all',
  termSize: 5,
  excludeHitsFromPreviousRun: false,
  sourceFields: [],
  searchConfiguration: {
    query: { query, language: 'kuery' },
    index: dataView,
    filter,
  },
});

export const expectSampleSizeFooter = async ({
  pageObjects,
  sampleSize,
}: {
  pageObjects: ScoutTestFixtures['pageObjects'];
  sampleSize: number;
}) => {
  const { dataGrid } = pageObjects;

  await dataGrid.goToLastSamplePage(sampleSize, testData.DEFAULT_ROWS_PER_PAGE);
  await expect.poll(() => dataGrid.getDataGridFooterText()).toContain(String(sampleSize));
};

export const clearStoredQueryMode = async (page: ScoutPage): Promise<void> => {
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, DISCOVER_QUERY_MODE_KEY);
};

/*
 * Waits until the persisted query mode in `localStorage` equals `expectedMode` to prevent flakiness
 */
export const waitForStoredQueryMode = async (
  page: ScoutPage,
  expectedMode: QueryMode
): Promise<void> => {
  await page.waitForFunction(
    ([storageKey, mode]) => {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue == null) {
        return false;
      }
      try {
        return JSON.parse(storedValue)?.currentMode === mode;
      } catch {
        return false;
      }
    },
    [DISCOVER_QUERY_MODE_KEY, expectedMode] as const
  );
};

export const switchToMode = async (
  page: ScoutPage,
  pageObjects: ScoutTestFixtures['pageObjects'],
  mode: QueryMode
): Promise<void> => {
  if (mode === 'esql') {
    await pageObjects.discover.selectTextBaseLang();
  } else {
    await pageObjects.discover.selectClassicMode();
  }

  await waitForStoredQueryMode(page, mode);
  await page.gotoApp('discover');
  await pageObjects.discover.waitUntilTabIsLoaded();
};

const getStoredQueryMode = async (page: ScoutPage): Promise<QueryMode | null> => {
  return page.evaluate((storageKey) => {
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue == null) {
      return null;
    }
    // The app persists `{ currentMode, defaultMode }` JSON-encoded.
    try {
      const parsedMode = JSON.parse(storedValue)?.currentMode;
      return parsedMode === 'classic' || parsedMode === 'esql' ? parsedMode : null;
    } catch {
      return null;
    }
  }, DISCOVER_QUERY_MODE_KEY);
};

export const getCurrentAndStoredMode = async (
  page: ScoutPage,
  pageObjects: ScoutTestFixtures['pageObjects']
): Promise<{ currentMode: QueryMode; storedMode: QueryMode | null }> => {
  const currentMode = await pageObjects.discover.getCurrentQueryMode();
  const storedMode = await getStoredQueryMode(page);
  return { currentMode, storedMode };
};

/**
 * Submits an ES|QL query expected to trigger the cascade (grouped) layout and
 * returns whether the cascade layout actually rendered. Assertion is left to
 * the caller so it stays in the test body, not hidden inside a helper.
 */
export const runCascadeQuery = async (
  pageObjects: ScoutTestFixtures['pageObjects'],
  query: string
): Promise<boolean> => {
  await pageObjects.discover.writeAndSubmitEsqlQuery(query);
  return pageObjects.discover.isShowingCascadeLayout();
};

/**
 * Discover page root, including the top nav. The tabs bar renders above it and
 * is scanned as a second root.
 */
const PAGE_TEST_SUBJ = '[data-test-subj="dscPage"]';
const TABS_BAR_TEST_SUBJ = '[data-test-subj="unifiedTabs_tabsBar"]';

/**
 * Left out of page-level scans, both pre-existing violations we do not own:
 *
 * - the tabs bar's tablist holds its tabs through `aria-owns` rather than as
 *   children (`aria-required-children`, `@kbn/unified-tabs`);
 * - EUI's virtualized grid body scrolls without being keyboard focusable
 *   (`scrollable-region-focusable`) whenever it overflows.
 *
 * Both are scoped to the offending node so the rest of the tabs bar and the
 * rest of the grid stay covered. The grid scroll container has no test subject
 * or role, so its EUI class is the only handle — if that class is ever renamed
 * the scan fails loudly on the violation rather than silently losing coverage.
 */
const PAGE_SCAN_EXCLUSIONS = [
  '[data-test-subj="unifiedTabs_tabsBar"] [role="tablist"]',
  '.euiDataGrid__virtualized',
];

/**
 * Runs an axe scan over the Discover page and returns the violations, so the
 * assertion stays in the test body.
 */
export const getPageA11yViolations = async (page: ScoutPage): Promise<string[]> => {
  const { violations } = await page.checkA11y({
    include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
    exclude: PAGE_SCAN_EXCLUSIONS,
  });
  return violations;
};
