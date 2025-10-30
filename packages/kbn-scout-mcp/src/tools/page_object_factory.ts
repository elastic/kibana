/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from 'playwright';
import { subj } from '@kbn/test-subj-selector';

/**
 * Factory to create page object instances
 *
 * Note: This is a simplified implementation. In a real Scout environment,
 * page objects would be properly instantiated with ScoutPage which includes
 * additional helpers like testSubj, gotoApp, etc.
 *
 * For MCP server usage, we create simplified wrappers around Playwright Page.
 */
export async function createPageObjectInstance(
  pageObjectName: string,
  page: Page
): Promise<any> {
  // Wrap the page with Scout-like helpers
  const scoutPage = wrapPageWithScoutHelpers(page);

  switch (pageObjectName) {
    case 'discover':
      return createDiscoverPageObject(scoutPage);
    case 'dashboard':
      return createDashboardPageObject(scoutPage);
    case 'filterBar':
      return createFilterBarPageObject(scoutPage);
    case 'datePicker':
      return createDatePickerPageObject(scoutPage);
    case 'maps':
      return createMapsPageObject(scoutPage);
    case 'collapsibleNav':
      return createCollapsibleNavPageObject(scoutPage);
    case 'toasts':
      return createToastsPageObject(scoutPage);
    default:
      return null;
  }
}

/**
 * Wrap a Playwright page with Scout-like helpers
 */
function wrapPageWithScoutHelpers(page: Page) {
  return {
    ...page,
    testSubj: {
      click: (selector: string) => page.locator(subj(selector)).click(),
      fill: (selector: string, value: string) => page.locator(subj(selector)).fill(value),
      typeWithDelay: (selector: string, text: string) =>
        page.locator(subj(selector)).pressSequentially(text, { delay: 50 }),
      waitForSelector: (selector: string, options?: any) =>
        page.locator(subj(selector)).waitFor(options),
      locator: (selector: string) => page.locator(subj(selector)),
      isVisible: (selector: string, options?: any) =>
        page.locator(subj(selector)).isVisible(options),
      innerText: (selector: string) => page.locator(subj(selector)).innerText(),
      hover: (selector: string) => page.locator(subj(selector)).hover(),
      clearInput: (selector: string) => page.locator(subj(selector)).clear(),
    },
    gotoApp: (app: string, path?: string) => {
      const url = `/app/${app}${path || ''}`;
      return page.goto(url);
    },
    waitForLoadingIndicatorHidden: () => {
      return page.locator(subj('globalLoadingIndicator')).waitFor({ state: 'hidden' }).catch(() => {
        // Loading indicator might not exist, that's ok
      });
    },
  };
}

/**
 * Simplified Discover page object
 */
function createDiscoverPageObject(page: any) {
  return {
    async goto() {
      await page.gotoApp('discover');
    },
    async selectDataView(name: string) {
      const currentValue = await page.testSubj.innerText('*dataView-switch-link');
      if (currentValue === name) {
        return;
      }
      await page.testSubj.click('*dataView-switch-link');
      await page.testSubj.waitForSelector('indexPattern-switcher');
      await page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
      await page.testSubj.locator('indexPattern-switcher').locator(`[title="${name}"]`).click();
      await page.testSubj.waitForSelector('indexPattern-switcher', { state: 'hidden' });
      await page.waitForLoadingIndicatorHidden();
    },
    async clickNewSearch() {
      await page.testSubj.hover('discoverNewButton');
      await page.testSubj.click('discoverNewButton');
      await page.testSubj.hover('unifiedFieldListSidebar__toggle-collapse');
      await page.waitForLoadingIndicatorHidden();
    },
    async saveSearch(name: string) {
      await page.testSubj.click('discoverSaveButton');
      await page.testSubj.fill('savedObjectTitle', name);
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await page.testSubj.waitForSelector('savedObjectSaveModal', { state: 'hidden' });
      await page.waitForLoadingIndicatorHidden();
    },
    async waitForHistogramRendered() {
      await page.testSubj.waitForSelector('unifiedHistogramRendered');
    },
  };
}

/**
 * Simplified Dashboard page object
 */
function createDashboardPageObject(page: any) {
  return {
    async goto() {
      await page.gotoApp('dashboards');
    },
    async waitForListingTableToLoad() {
      return page.testSubj.waitForSelector('table-is-ready', { state: 'visible' });
    },
    async openNewDashboard() {
      await page.testSubj.click('newItemButton');
      await page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
    },
    async saveDashboard(name: string) {
      await page.testSubj.click('dashboardInteractiveSaveMenuItem');
      await page.testSubj.fill('savedObjectTitle', name);
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'hidden' });
    },
    async addPanelFromLibrary(...names: string[]) {
      await page.testSubj.click('dashboardAddTopNavButton');
      await page.testSubj.click('dashboardAddFromLibraryButton');
      for (let i = 0; i < names.length; i++) {
        if (i > 0) {
          await page.testSubj.clearInput('savedObjectFinderSearchInput');
        }
        await page.testSubj.typeWithDelay('savedObjectFinderSearchInput', names[i]);
        await page.testSubj.click(`savedObjectTitle${names[i].replace(/ /g, '-')}`);
        await page.testSubj.waitForSelector(
          `embeddablePanelHeading-${names[i].replace(/[- ]/g, '')}`,
          { state: 'visible' }
        );
      }
      await page.testSubj.click('euiFlyoutCloseButton');
      await page.testSubj.waitForSelector('euiFlyoutCloseButton', { state: 'hidden' });
    },
    async removePanel(name: string) {
      const panelHeaderTestSubj =
        name === 'embeddableError' ? name : `embeddablePanelHeading-${name.replace(/ /g, '')}`;
      await page.testSubj.locator(panelHeaderTestSubj).scrollIntoViewIfNeeded();
      await page.testSubj.locator(panelHeaderTestSubj).hover();
      await page.testSubj.click('embeddablePanelToggleMenuIcon');
      await page.testSubj.click('embeddablePanelAction-deletePanel');
      await page.testSubj.waitForSelector(panelHeaderTestSubj, { state: 'hidden' });
    },
    async waitForPanelsToLoad(expectedCount: number) {
      const selector = '[data-test-subj="embeddablePanel"][data-render-complete="true"]';
      const timeout = 20000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const count = await page.locator(selector).count();
        if (count === expectedCount) return;
        await page.waitForTimeout(100);
      }

      throw new Error(`Timeout waiting for ${expectedCount} panels`);
    },
  };
}

/**
 * Simplified FilterBar page object
 */
function createFilterBarPageObject(page: any) {
  return {
    async addFilter(options: { field: string; operator: string; value: string }) {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover');
      await page.testSubj.typeWithDelay('filterFieldSuggestionList > comboBoxSearchInput', options.field);
      await page.click(`.euiFilterSelectItem[title="${options.field}"]`);
      await page.testSubj.typeWithDelay('filterOperatorList > comboBoxSearchInput', options.operator);
      await page.click(`.euiFilterSelectItem[title="${options.operator}"]`);
      const filterParamsInput = page.locator('[data-test-subj="filterParams"] input');
      await filterParamsInput.focus();
      await filterParamsInput.pressSequentially(options.value, { delay: 100 });
      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('^filter-badge', { state: 'visible' });
    },
    async hasFilter(options: { field: string; value: string; enabled?: boolean }) {
      const testSubjLocator = [
        '~filter',
        options.enabled !== undefined && `~filter-${options.enabled ? 'enabled' : 'disabled'}`,
        options.field && `~filter-key-${options.field}`,
        options.value && `~filter-value-${options.value}`,
      ]
        .filter(Boolean)
        .join(' & ');

      return page.testSubj.isVisible(testSubjLocator, { strict: true });
    },
  };
}

/**
 * Simplified DatePicker page object
 */
function createDatePickerPageObject(page: any) {
  return {
    async setAbsoluteRange(from: string, to: string) {
      await page.testSubj.click('superDatePickerToggleQuickMenuButton');
      await page.testSubj.click('superDatePickerAbsoluteTab');
      await page.testSubj.fill('superDatePickerAbsoluteDateInput', from);
      await page.testSubj.fill('superDatePickerAbsoluteDateInput', to);
      await page.testSubj.click('superDatePickerApplyTimeButton');
    },
    async setCommonlyUsedTime(timeRange: string) {
      await page.testSubj.click('superDatePickerToggleQuickMenuButton');
      await page.testSubj.click(`superDatePickerCommonlyUsed_${timeRange}`);
    },
  };
}

/**
 * Simplified Maps page object
 */
function createMapsPageObject(page: any) {
  return {
    async goto() {
      await page.gotoApp('maps');
    },
    async waitForLayersToLoad() {
      await page.testSubj.waitForSelector('mapContainer', { state: 'visible' });
    },
  };
}

/**
 * Simplified CollapsibleNav page object
 */
function createCollapsibleNavPageObject(page: any) {
  return {
    async open() {
      const isOpen = await this.isOpen();
      if (!isOpen) {
        await page.testSubj.click('toggleNavButton');
      }
    },
    async close() {
      const isOpen = await this.isOpen();
      if (isOpen) {
        await page.testSubj.click('toggleNavButton');
      }
    },
    async isOpen() {
      return page.testSubj.isVisible('collapsibleNav');
    },
    async clickLink(name: string) {
      await this.open();
      await page.click(`[data-test-subj="collapsibleNavAppLink"][title="${name}"]`);
    },
  };
}

/**
 * Simplified Toasts page object
 */
function createToastsPageObject(page: any) {
  return {
    async getToasts() {
      return page.locator('[data-test-subj="toastMessage"]').allInnerTexts();
    },
    async dismissAll() {
      const closeButtons = page.locator('[data-test-subj="toastCloseButton"]');
      const count = await closeButtons.count();
      for (let i = 0; i < count; i++) {
        await closeButtons.nth(0).click();
      }
    },
    async waitForToastCount(count: number) {
      await page.locator('[data-test-subj="toastMessage"]').nth(count - 1).waitFor();
    },
    async expectSuccess(message?: string) {
      const toast = page.locator('[data-test-subj="toastMessage"]').first();
      await toast.waitFor({ state: 'visible' });
      if (message) {
        const text = await toast.innerText();
        if (!text.includes(message)) {
          throw new Error(`Expected success toast with message "${message}", but got "${text}"`);
        }
      }
    },
    async expectError(message?: string) {
      const toast = page.locator('[data-test-subj="toastMessage"]').first();
      await toast.waitFor({ state: 'visible' });
      if (message) {
        const text = await toast.innerText();
        if (!text.includes(message)) {
          throw new Error(`Expected error toast with message "${message}", but got "${text}"`);
        }
      }
    },
  };
}
