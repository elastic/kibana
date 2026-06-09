/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Extended save that supports `saveAsNew` and `storeTimeRange` options.
 * The base `DiscoverApp.saveSearch` only handles the name.
 */
export const saveSearchExtended = async (
  page: ScoutPage,
  name: string,
  options?: { saveAsNew?: boolean; storeTimeRange?: boolean }
) => {
  await page.testSubj.click('discoverSaveButton');
  await page.testSubj.fill('savedObjectTitle', name);

  if (options?.saveAsNew !== undefined) {
    const checkbox = page.testSubj.locator('saveAsNewCheckbox');
    if (options.saveAsNew) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  if (options?.storeTimeRange !== undefined) {
    const toggle = page.testSubj.locator('storeTimeWithSearch');
    if (options.storeTimeRange) {
      await toggle.check();
    } else {
      await toggle.uncheck();
    }
  }

  await page.testSubj.click('confirmSaveSavedObjectButton');
  await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
};

/**
 * Creates an ad-hoc or persisted data view from the Discover search bar.
 * Mirrors the FTR `dataViews.createFromSearchBar` behavior.
 */
export const createDataViewFromSearchBar = async (
  page: ScoutPage,
  options: { name: string; adHoc?: boolean; hasTimeField?: boolean }
) => {
  // Dismiss any tab preview popup before interacting with the data view switcher
  await page.testSubj.hover('breadcrumbs');
  await page.testSubj.click('*dataView-switch-link');
  await page.testSubj.click('dataview-create-new');

  const flyout = page.testSubj.locator('indexPatternEditorFlyout');
  await expect(flyout).toBeVisible();

  const titleInput = page.testSubj.locator('createIndexPatternTitleInput');

  // Type char-by-char to trigger the data view editor's auto-complete behavior
  await expect(async () => {
    await titleInput.clear();
    await titleInput.pressSequentially(options.name, { delay: 50 });
    await expect(titleInput).toHaveAttribute('data-is-validating', '0', { timeout: 10_000 });
    await expect(titleInput).not.toHaveAttribute('aria-invalid', 'true', { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });

  // Wait for timestamp field to finish loading
  const timestampField = page.testSubj.locator('timestampField');
  await timestampField
    .and(page.locator('[data-is-loading="0"]'))
    .waitFor({ state: 'visible', timeout: 30_000 });

  // If no time field is needed and the timestamp combobox is enabled, select "no time filter"
  const comboInput = page.testSubj.locator('timestampField >> comboBoxSearchInput');
  if (!options.hasTimeField && (await comboInput.isEnabled())) {
    await comboInput.click();
    await comboInput.fill("--- I don't want to use the time filter ---");
    // Wait for the option to appear in the combobox dropdown and click it
    const optionLocator = page.getByRole('option', {
      name: "--- I don't want to use the time filter ---",
    });
    await optionLocator.click();
  }

  if (options.adHoc) {
    await page.testSubj.click('exploreIndexPatternButton');
  } else {
    await page.testSubj.click('saveIndexPatternButton');
  }

  // Wait for the flyout to close before continuing
  await expect(flyout).toBeHidden({ timeout: 30_000 });
};

/**
 * Switches from ES|QL mode to data view mode via the tab context menu.
 */
export const selectDataViewMode = async (page: ScoutPage, options?: { discardModal?: boolean }) => {
  // Click the tab menu for the active tab, then select "Switch to classic"
  const activeTab = page.locator(
    '[data-test-subj^="unifiedTabs_selectTabBtn_"][aria-selected="true"]'
  );
  const testSubj = await activeTab.getAttribute('data-test-subj');
  const tabId = testSubj?.replace('unifiedTabs_selectTabBtn_', '') ?? '';
  await page.testSubj.click(`unifiedTabs_tabMenuBtn_${tabId}`);
  await page.testSubj.click('unifiedTabs_tabMenuItem_switchToClassic');

  if (options?.discardModal) {
    await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeVisible();
    await page.testSubj.click('discover-esql-to-dataview-no-save-btn');
    await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeHidden();
  }

  // Move mouse away from the tab bar to dismiss any tab preview popup
  await page.testSubj.hover('breadcrumbs');
};

/**
 * Dismisses all visible toasts by clicking each dismiss button.
 */
const dismissAllToasts = async (page: ScoutPage) => {
  const toastList = page.testSubj.locator('globalToastList');
  // Wait briefly for any toasts to appear, then dismiss them
  for (const dismissBtn of await toastList.locator('[data-test-subj$="dismissToast"]').all()) {
    await dismissBtn.click();
  }
};

/**
 * Opens the Lens edit flyout, switches the chart type, and applies.
 */
export const changeVisShape = async (page: ScoutPage, seriesType: string) => {
  await dismissAllToasts(page);

  await page.testSubj.click('unifiedHistogramEditFlyoutVisualization');
  await expect(page.testSubj.locator('lnsChartSwitchPopover')).toBeVisible();
  await page.testSubj.click('lnsChartSwitchPopover');
  await page.testSubj.fill('lnsChartSwitchSearch', seriesType);
  await page.testSubj.click(`lnsChartSwitchPopover_${seriesType.toLowerCase()}`);
  await expect(page.testSubj.locator('lnsChartSwitchPopover')).toHaveText(seriesType);

  await dismissAllToasts(page);

  await page.testSubj.locator('applyFlyoutButton').scrollIntoViewIfNeeded();
  await page.testSubj.click('applyFlyoutButton');
};

/**
 * Opens the Lens edit flyout, reads the current chart type, and closes.
 */
export const getCurrentVisTitle = async (page: ScoutPage): Promise<string> => {
  await dismissAllToasts(page);

  await page.testSubj.click('unifiedHistogramEditFlyoutVisualization');
  await expect(page.testSubj.locator('lnsChartSwitchPopover')).toBeVisible();
  const seriesType = await page.testSubj.innerText('lnsChartSwitchPopover');
  await page.testSubj.click('cancelFlyoutButton');
  return seriesType;
};

/**
 * Adds a field column from the sidebar field list.
 */
export const addFieldColumn = async (page: ScoutPage, field: string) => {
  await page.testSubj.fill('fieldListFiltersFieldSearch', field);
  await page.testSubj.click(`fieldToggle-${field}`);
};

/**
 * Returns the query string from the KQL query input.
 */
export const getQueryString = async (page: ScoutPage): Promise<string> => {
  return (await page.testSubj.locator('queryInput').inputValue()) ?? '';
};

/**
 * Submits the current query by clicking the query submit button.
 */
export const submitQuery = async (page: ScoutPage) => {
  await page.testSubj.click('querySubmitButton');
};

/**
 * Returns the currently selected data view name from the switcher.
 */
export const getSelectedDataViewName = async (page: ScoutPage): Promise<string> => {
  return page.testSubj.innerText('*dataView-switch-link');
};

/**
 * Returns the hit count text from the Discover query hits element.
 */
export const getHitCount = async (page: ScoutPage): Promise<string> => {
  return page.testSubj.innerText('discoverQueryHits');
};

/**
 * Returns the selected field names from the sidebar.
 */
export const getSelectedSidebarFields = async (page: ScoutPage): Promise<string[]> => {
  const selectedFields = page.testSubj.locator('fieldListGroupedSelectedFields');
  const isVisible = await selectedFields.isVisible();
  if (!isVisible) {
    return [];
  }
  const items = await selectedFields.locator('li').all();
  const fields: string[] = [];
  for (const item of items) {
    const attr = await item.getAttribute('data-attr-field');
    if (attr) {
      fields.push(attr);
    }
  }
  return fields;
};
