/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '../../../..';
import { expect } from '../..';
import { DEFAULT_SAVE_MODAL_TIMEOUT, type TimeoutOptions } from './base';
import { NavigationMixin } from './navigation';

/**
 * Save, load, revert and share/export actions for Discover.
 */
export abstract class SaveMixin extends NavigationMixin {
  private async confirmSaveModal(options?: TimeoutOptions) {
    const saveModal = this.page.testSubj.locator('savedObjectSaveModal');
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await expect(saveModal).toBeHidden({
      timeout: options?.timeout ?? DEFAULT_SAVE_MODAL_TIMEOUT,
    });
  }

  private getStoreTimeWithSearchSwitch() {
    return this.page.testSubj.locator('storeTimeWithSearch');
  }

  async openSaveSearchModal(name?: string) {
    await this.clickAppMenuItem('discoverSaveButton');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
    if (name !== undefined) {
      await this.page.testSubj.fill('savedObjectTitle', name);
    }
  }

  async openSaveSearchAsModal() {
    await this.saveButtonSecondary.click();
    await this.interactiveSaveMenuItem.click();
    await this.saveModal.modal.waitFor({ state: 'visible' });
  }

  async saveSearch(name: string, { storeTimeRange }: { storeTimeRange?: boolean } = {}) {
    await this.openSaveSearchModal(name);
    if (storeTimeRange !== undefined) {
      const switchControl = this.getStoreTimeWithSearchSwitch();
      await switchControl.waitFor({ state: 'visible' });
      const isChecked = (await switchControl.getAttribute('aria-checked')) === 'true';
      if (isChecked !== storeTimeRange) {
        await switchControl.click();
      }
    }
    await this.confirmSaveModal();
  }

  async saveSearchAsNew(name: string) {
    await this.clickAppMenuItem('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    const checkbox = this.page.testSubj.locator('saveAsNewCheckbox');
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    await this.confirmSaveModal();
  }

  async saveUnsavedChanges() {
    await this.clickAppMenuItem('discoverSaveButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'visible' });
    await this.confirmSaveModal();
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Clicks "Save and return" in the top nav, available when Discover is opened as
   * the editor for a by-value dashboard panel. Transfers the panel state straight
   * back to the dashboard without opening a save modal.
   */
  async saveAndReturnToEditor() {
    await this.clickAppMenuItem('discoverSaveButton');
  }

  /**
   * Clicks "Cancel" in the top nav save split-button, available when Discover is
   * opened as the editor for a by-value dashboard panel. Discards the edits and
   * returns to the dashboard.
   */
  async cancelEditorChanges() {
    await this.page.testSubj.click('discoverSaveButton-secondary-button');
    await this.page.testSubj.locator('discoverCancelButton').click();
  }

  /**
   * Saves the current Discover table (including any ES|QL controls) as a by-value
   * panel on a brand-new dashboard, then navigates to that dashboard.
   */
  async saveTableToNewDashboard(title: string) {
    await this.page.testSubj.click('saveDiscoverTableToDashboardButton');
    await this.saveModal.modal.waitFor({ state: 'visible' });

    // Pick "new" before the title: filling the title re-renders the modal and would reset
    // the radio (confirm stays disabled on "existing" with no pick).
    await this.saveModal.selectNewDashboard();
    await this.saveModal.fillTitle(title);
    // Not `saveModal.confirm()`: it waits for the modal to close, which cannot happen yet.
    // Saving navigates away, and a session with unsaved changes raises the app-leave prompt
    // first, which keeps the save modal mounted until it is dismissed below.
    await this.page.testSubj.click('confirmSaveSavedObjectButton');

    // The leave prompt can also unmount on its own once navigation starts, so confirming it
    // is best effort.
    await this.page.testSubj
      .locator('appLeaveConfirmModal')
      .getByTestId('confirmModalConfirmButton')
      .click()
      .catch(() => {});

    await this.saveModal.modal.waitFor({ state: 'hidden', timeout: DEFAULT_SAVE_MODAL_TIMEOUT });
    // The panel travels to the dashboard in session storage and is consumed on arrival, so
    // the method only returns once the dashboard is reached.
    await this.page.waitForURL(/\/app\/dashboards/);
  }

  /**
   * Save the currently rendered inline visualization (e.g. an ES|QL chart) to a
   * brand-new dashboard via the "Save visualization" flow in the unified
   * histogram. Returns once the save modal has closed.
   */
  async saveVisualizationToNewDashboard(visName: string) {
    await this.page.testSubj.click('unifiedHistogramSaveVisualization');
    await expect(this.page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
    await this.page.testSubj.fill('savedObjectTitle', visName);
    // Clicking the EuiRadio wrapper does not toggle the underlying input
    // reliably; clicking the associated label does.
    await this.page.locator('label[for="new-dashboard-option"]').click();
    await this.confirmSaveModal();
  }

  async revertUnsavedChanges() {
    // Click the secondary button on the split save button
    await this.page.testSubj.click('discoverSaveButton-secondary-button');

    // Wait for popover and revert
    const revertButton = this.page.testSubj.locator('revertUnsavedChangesButton');
    await expect(revertButton).toBeVisible();
    await revertButton.click();

    await this.waitUntilSearchingHasFinished();
  }

  unsavedChangesIndicator(): Locator {
    return this.page.testSubj.locator('split-button-notification-indicator');
  }

  async loadSavedSearch(searchName: string) {
    await this.clickAppMenuItem('discoverOpenButton');
    await this.page.testSubj.waitForSelector('loadSearchForm', { state: 'visible' });

    // Filter for the search
    const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
    await searchInput.fill(`"${searchName.replace('-', ' ')}"`);

    // Click the saved search
    const savedSearchId = searchName.split(' ').join('-');
    await this.page.testSubj.click(`savedObjectTitle${savedSearchId}`);
    await this.waitUntilSearchingHasFinished();
  }

  async getSharedUrl(): Promise<string> {
    await this.clickAppMenuItem('shareTopNavButton');

    const copyButton = this.page.testSubj.locator('copyShareUrlButton');

    await copyButton.waitFor({ state: 'visible' });
    await copyButton.click();

    const sharedUrl = await this.page.waitForFunction(() => {
      return document
        .querySelector('[data-test-subj="copyShareUrlButton"]')
        ?.getAttribute('data-share-url');
    });

    const url = await sharedUrl.jsonValue();
    if (typeof url !== 'string') {
      throw new Error('Share URL was not available on the copy button');
    }
    return url;
  }

  async closeShareModal() {
    const shareModal = this.page.testSubj.locator('shareContextModal');

    if (await shareModal.isVisible()) {
      await shareModal.getByLabel(/Close/).click();
      await shareModal.waitFor({ state: 'hidden' });
    }
  }

  async exportAsCsv(options?: TimeoutOptions): Promise<import('playwright-core').Download> {
    // Export may live in the top nav or the overflow menu depending on viewport / Discover layout.
    await this.clickAppMenuItem('exportTopNavButton');
    await this.page.testSubj.click('exportMenuItem-CSV');

    // 2. Trigger the report generation
    await this.page.testSubj.click('generateReportButton');

    // 3. Explicitly wait for the report to finish generating
    const downloadBtn = this.page.testSubj.locator('downloadCompletedReportButton');
    const reportFailure = this.page.locator('[data-test-errorText]');
    await downloadBtn.or(reportFailure).waitFor({
      state: 'visible',
      timeout: options?.timeout ?? 30_000,
    });

    if (await reportFailure.isVisible()) {
      const errorText = await reportFailure.getAttribute('data-test-errorText');
      throw new Error(`CSV report generation failed: ${errorText ?? 'Unknown error'}`);
    }

    // 4. Coordinate the click and the event listener
    const [download] = await Promise.all([
      this.page.waitForEvent('download'), // Set listener
      downloadBtn.click(), // Perform action
    ]);

    return download;
  }
}
