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
import { testData } from '.';

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

export const getStoredQueryMode = async (page: ScoutPage): Promise<'classic' | 'esql' | null> => {
  return page.evaluate((storageKey) => {
    const storedValue = window.localStorage.getItem(storageKey);
    // The app persists the value JSON-encoded (e.g. `"esql"`).
    try {
      const parsedValue = JSON.parse(storedValue);
      return parsedValue === 'classic' || parsedValue === 'esql' ? parsedValue : null;
    } catch {
      return null;
    }
  }, DISCOVER_QUERY_MODE_KEY);
};

/*
 * Waits until the persisted query mode in `localStorage` equals `expectedMode`.
 * Discover writes this value asynchronously after a mode switch, so callers
 * should wait for it (rather than asserting immediately) to avoid flakiness.
 */
export const waitForStoredQueryMode = async (
  page: ScoutPage,
  expectedMode: 'classic' | 'esql'
): Promise<void> => {
  await page.waitForFunction(
    ([storageKey, mode]) => {
      const storedValue = window.localStorage.getItem(storageKey);
      try {
        return JSON.parse(storedValue) === mode;
      } catch {
        return false;
      }
    },
    [DISCOVER_QUERY_MODE_KEY, expectedMode] as const
  );
};
