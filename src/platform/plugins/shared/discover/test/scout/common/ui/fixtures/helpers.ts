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

export const countSearchRequests = async (
  page: ScoutPage,
  type: 'ese' | 'esql'
): Promise<number> => {
  const searchType = type === 'esql' ? 'esql_async' : type;
  const entries = await page.evaluate(() =>
    performance
      .getEntries()
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          (entry as PerformanceResourceTiming).initiatorType === 'fetch' ||
          (entry as PerformanceResourceTiming).initiatorType === 'xmlhttprequest'
      )
  );
  // Use anchored match to exclude async polling URLs like /esql_async/{id}
  return entries.filter((entry) =>
    new RegExp(`/internal/search/${searchType}([?#]|$)`).test(entry.name)
  ).length;
};

const CHART_RENDER_COUNT_SELECTOR =
  '[data-test-subj="unifiedHistogramChart"] [data-rendering-count]';

// The Lens embeddable increments data-rendering-count each time it paints new data, so a counter
// increase past a snapshot is a reliable "chart request completed" signal. The snapshot also tags
// the chart's DOM node: if an action remounts the chart (e.g. new search, show after hide), the
// counter restarts, so waitForChartRerender detects the untagged node and requires
// data-render-complete instead (false on a fresh mount until the first data render).
const snapshotChartRenderCount = async (page: ScoutPage): Promise<number> => {
  return page.evaluate((selector) => {
    const chartElement = document.querySelector(selector);
    if (!chartElement) {
      return 0;
    }
    (chartElement as Element & { __scoutRenderSnapshot?: boolean }).__scoutRenderSnapshot = true;
    return Number(chartElement.getAttribute('data-rendering-count') ?? '0');
  }, CHART_RENDER_COUNT_SELECTOR);
};

const waitForChartRerender = async (
  page: ScoutPage,
  previousRenderCount: number
): Promise<void> => {
  await page.waitForFunction(
    ([selector, renderCount]) => {
      const chartElement = document.querySelector(selector);
      if (!chartElement) {
        return false;
      }
      const isSameElement = (chartElement as Element & { __scoutRenderSnapshot?: boolean })
        .__scoutRenderSnapshot;
      if (!isSameElement) {
        return chartElement.getAttribute('data-render-complete') === 'true';
      }
      return Number(chartElement.getAttribute('data-rendering-count') ?? '0') > renderCount;
    },
    [CHART_RENDER_COUNT_SELECTOR, previousRenderCount] as const
  );
};

// Clears the resource timing buffer, runs the optional action, waits for Discover's search to
// settle, then returns the number of matching search requests. PerformanceResourceTiming entries
// are added when responseEnd fires — before the fetch Promise resolves and before Discover can
// clear the loading indicator — so the count is stable by the time waitUntilSearchingHasFinished
// returns. No polling is needed; use a plain expect(count).toBe(N) at the call site.
//
// waitUntilSearchingHasFinished only tracks the documents grid indicator, not the chart's own
// search request. Pass `waitForChartRerender: true` for actions that trigger a chart request so
// the count also includes the chart's response (and a late response cannot leak into a later
// measurement). Leave it off for actions that trigger no chart request — the wait would never
// resolve.
export const measureSearchRequests = async (
  page: ScoutPage,
  discover: DiscoverPageInterface,
  type: 'ese' | 'esql',
  action?: () => Promise<void>,
  {
    waitForChartRerender: shouldWaitForChartRerender = false,
  }: { waitForChartRerender?: boolean } = {}
): Promise<number> => {
  await page.evaluate(() => {
    performance.setResourceTimingBufferSize(Number.MAX_SAFE_INTEGER);
    performance.clearResourceTimings();
  });

  const previousRenderCount = shouldWaitForChartRerender ? await snapshotChartRenderCount(page) : 0;

  if (action) {
    await action();
  }

  await discover.waitUntilSearchingHasFinished();

  if (shouldWaitForChartRerender) {
    await waitForChartRerender(page, previousRenderCount);
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
