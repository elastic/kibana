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

export interface DiscoverPageInterface {
  waitUntilSearchingHasFinished: () => Promise<void>;
}

// Anchored to exclude async polling URLs like /esql_async/{id}
const getSearchEndpointPattern = (type: 'ese' | 'esql'): string => {
  const searchType = type === 'esql' ? 'esql_async' : type;
  return `/internal/search/${searchType}([?#]|$)`;
};

const countSearchRequests = async (page: ScoutPage, type: 'ese' | 'esql'): Promise<number> => {
  return page.evaluate(
    (pattern) =>
      performance
        .getEntries()
        .filter(
          (entry): entry is PerformanceResourceTiming =>
            (entry as PerformanceResourceTiming).initiatorType === 'fetch' ||
            (entry as PerformanceResourceTiming).initiatorType === 'xmlhttprequest'
        )
        .filter((entry) => new RegExp(pattern).test(entry.name)).length,
    getSearchEndpointPattern(type)
  );
};

export const measureSearchRequests = async (
  page: ScoutPage,
  discover: DiscoverPageInterface,
  type: 'ese' | 'esql',
  expectedCount: number,
  action?: () => Promise<void>
): Promise<number> => {
  await page.evaluate(() => {
    performance.setResourceTimingBufferSize(Number.MAX_SAFE_INTEGER);
    performance.clearResourceTimings();
  });

  if (action) {
    await action();
  }

  await discover.waitUntilSearchingHasFinished();

  if (expectedCount > 0) {
    await page
      .waitForFunction(
        ([pattern, expected]) =>
          performance
            .getEntries()
            .filter(
              (entry): entry is PerformanceResourceTiming =>
                (entry as PerformanceResourceTiming).initiatorType === 'fetch' ||
                (entry as PerformanceResourceTiming).initiatorType === 'xmlhttprequest'
            )
            .filter((entry) => new RegExp(pattern).test(entry.name)).length >= expected,
        [getSearchEndpointPattern(type), expectedCount] as const,
        { timeout: 10_000 }
      )
      .catch(() => {
        // Fall through to the final count so the caller's assertion reports the actual number
      });
  }

  return countSearchRequests(page, type);
};

export type QueryMode = 'classic' | 'esql';

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
