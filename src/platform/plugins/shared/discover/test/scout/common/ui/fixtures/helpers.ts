/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, ScoutTestFixtures } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DISCOVER_QUERY_MODE_KEY } from '../../../../../common/constants';
import * as testData from './constants';

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
 * All rendered ES|QL / dashboard controls, wherever they live.
 *
 * On a dashboard an ES|QL control is stored as a top-level `esql_control` panel
 * rather than a control-group control, so it renders `[data-control-id]` *without*
 * the `control-frame` wrapper that `DashboardApp.getControlIds()` requires. In
 * Discover the same control does sit inside a control group. Matching on
 * `[data-control-id]` alone therefore works in both places.
 */
const getControls = (page: ScoutPage) => page.locator('[data-control-id]');

/** Asserts exactly one control is rendered and returns its id. */
export const getOnlyControlId = async (page: ScoutPage): Promise<string> => {
  const controls = getControls(page);
  await expect(controls).toHaveCount(1);
  const controlId = await controls.getAttribute('data-control-id');
  if (!controlId) {
    throw new Error('Control is rendered but has an empty data-control-id');
  }
  return controlId;
};

/**
 * Creates an ES|QL control from the Discover editor by typing a query that ends in
 * a variable position, picking "Create control" from the suggestion widget, and
 * saving the flyout. Returns once the control group is rendered.
 */
export const createEsqlControl = async (
  page: ScoutPage,
  query: string,
  { variableName, label, values }: { variableName?: string; label?: string; values?: string[] } = {}
): Promise<void> => {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.setCodeEditorValue(query);
  await codeEditor.triggerSuggest(query);

  const suggestionWidget = codeEditor.getCodeEditorSuggestWidget();
  await suggestionWidget.waitFor({ state: 'visible' });
  await suggestionWidget.locator('.monaco-list-row', { hasText: 'Create control' }).click();

  const flyout = page.testSubj.locator('create_esql_control_flyout');
  await flyout.waitFor({ state: 'visible' });

  if (variableName !== undefined) {
    await page.testSubj.fill('esqlVariableName', variableName);
  }
  if (label !== undefined) {
    await page.testSubj.fill('esqlControlLabel', label);
  }
  if (values) {
    const valuesComboBox = page.components.comboBox('esqlValuesOptions');
    for (const value of values) {
      await valuesComboBox.setCustomSelectedOptions([value]);
    }
  }

  const saveButton = page.testSubj.locator('saveEsqlControlsFlyoutButton');
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await flyout.waitFor({ state: 'hidden' });
  await page.testSubj.locator('controls-group-wrapper').waitFor({ state: 'visible' });
};
