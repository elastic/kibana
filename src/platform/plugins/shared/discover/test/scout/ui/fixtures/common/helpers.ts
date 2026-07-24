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
import { DataViewEditorPage } from '@kbn/data-view-editor-plugin/test/scout/ui/fixtures/page_objects';
import { DISCOVER_QUERY_MODE_KEY } from '../../../../../common/constants';
import { testData } from '.';

export type QueryMode = 'classic' | 'esql';

export interface DataViewOptions {
  /** Data view title; `*` is appended automatically by the editor. */
  name: string;
  /** Create a temporary ("ad hoc") data view via "Explore" instead of saving. */
  adHoc?: boolean;
}

/**
 * Drives the shared data view editor flyout (owned by the `data_view_editor` plugin).
 * FTR passes the base name and relies on the editor auto-appending `*`; the page object
 * fills the title verbatim, so append the wildcard here to preserve that contract.
 */
const fillAndSubmitDataViewEditor = async (
  page: ScoutPage,
  { name, adHoc = false }: DataViewOptions
): Promise<void> => {
  const dataViewEditor = new DataViewEditorPage(page);
  await dataViewEditor.setTitle(name.endsWith('*') ? name : `${name}*`);
  await dataViewEditor.save({ adHoc });
};

/**
 * Creates a new data view from the Discover search bar data-view switcher
 * (classic mode only).
 */
export const createDataViewFromSearchBar = async (
  page: ScoutPage,
  pageObjects: ScoutTestFixtures['pageObjects'],
  options: DataViewOptions
): Promise<void> => {
  await pageObjects.discover.openDataViewSwitcher();
  await page.testSubj.click('dataview-create-new');
  await fillAndSubmitDataViewEditor(page, options);
  await pageObjects.discover.waitUntilTabIsLoaded();
};

/** Creates a new data view from the Discover "no data view" prompt. */
export const createDataViewFromNoDataPrompt = async (
  page: ScoutPage,
  pageObjects: ScoutTestFixtures['pageObjects'],
  options: DataViewOptions
): Promise<void> => {
  await page.testSubj.click('createDataViewButton');
  await fillAndSubmitDataViewEditor(page, options);
  await pageObjects.discover.waitUntilTabIsLoaded();
};

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
        return JSON.parse(storedValue) === mode;
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
    // The app persists the value JSON-encoded (e.g. `"esql"`).
    try {
      const parsedValue = JSON.parse(storedValue);
      return parsedValue === 'classic' || parsedValue === 'esql' ? parsedValue : null;
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
