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

interface JobPollResult {
  failed: boolean;
  errorText?: string;
}

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

  /** Saves an embedded edit as a new library session and opens it in normal Discover mode. */
  async saveEditorSessionAsNew(name: string) {
    await this.page.testSubj.click('discoverSaveButton-secondary-button');
    const popover = this.page.testSubj.locator('discoverSaveButtonPopover');
    await popover.waitFor({ state: 'visible' });
    await this.page.testSubj.click('interactiveSaveMenuItem');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.confirmSaveModal();
    await this.waitUntilTabIsLoaded();
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

  async exportAsCsv(
    options?: TimeoutOptions & { _retried?: boolean }
  ): Promise<import('playwright-core').Download> {
    const timeout = options?.timeout ?? 30_000;

    // Arm the response interceptor before clicking so we never miss it.
    // Use the caller's timeout — the page default (10s) is too short for 3 button clicks + HTTP.
    const generateResponsePromise = this.page.waitForResponse(
      (r) => r.url().includes('/internal/reporting/generate/') && r.request().method() === 'POST',
      { timeout }
    );

    // Export may live in the top nav or the overflow menu depending on viewport / Discover layout.
    // Settle the interceptor on click errors so it never produces an unhandled rejection.
    try {
      await this.clickAppMenuItem('exportTopNavButton');
      await this.page.testSubj.click('exportMenuItem-CSV');
      await this.page.testSubj.click('generateReportButton');
    } catch (clickErr) {
      generateResponsePromise.catch(() => {});
      throw clickErr;
    }

    const generateResponse = await generateResponsePromise;
    if (!generateResponse.ok()) {
      throw new Error(
        `CSV report generate request failed with status ${generateResponse.status()}`
      );
    }
    const { job } = (await generateResponse.json()) as { job: { id: string } };

    // Poll the reporting API by job ID. UI locators are page-global — a stale download button
    // or error toast from a previous test can settle a UI-race before the new job finishes.
    // Derive the reporting base URL from the generate response URL rather than page.url() so
    // that a non-root Kibana base path (e.g. /my-kibana) is preserved correctly.
    const reportingBase = generateResponse.url().replace(/\/internal\/reporting\/.*/, '');
    const { failed, errorText } = await this.pollJobStatus(job.id, reportingBase, timeout);

    if (failed) {
      // version_conflict_engine_exception is a transient error in the reporting/ES write path
      // (tracked in https://github.com/elastic/kibana/issues/290053). Retry once with a fresh
      // generate request — the new job gets a new UUID so there is no conflict possibility.
      if (errorText?.includes('version_conflict_engine_exception') && !options?._retried) {
        return this.exportAsCsv({ ...options, _retried: true });
      }
      throw new Error(`CSV report generation failed: ${errorText ?? 'Unknown error'}`);
    }

    const downloadBtn = this.page.testSubj.locator('downloadCompletedReportButton');
    await downloadBtn.waitFor({ state: 'visible', timeout });

    const [download] = await Promise.all([this.page.waitForEvent('download'), downloadBtn.click()]);
    return download;
  }

  private async pollJobStatus(
    jobId: string,
    reportingBase: string,
    timeout: number
  ): Promise<JobPollResult> {
    let job: { status: string; output?: { warnings?: string[] } } | undefined;

    // Use page.evaluate so the fetch runs inside the browser context, which carries the full
    // session (cookies, auth tokens). page.request.get() uses a separate Playwright API context
    // that can miss session state and receive 403 on Kibana internal endpoints.
    await expect
      .poll(
        async () => {
          try {
            job = await this.page.evaluate(async (url) => {
              const res = await fetch(url, { credentials: 'same-origin' });
              if (!res.ok) return undefined;
              return res.json() as Promise<{ status: string; output?: { warnings?: string[] } }>;
            }, `${reportingBase}/internal/reporting/jobs/info/${jobId}`);
            return job?.status ?? 'pending';
          } catch {
            return 'pending';
          }
        },
        { timeout, message: `CSV report ${jobId} did not reach a terminal status` }
      )
      .toMatch(/completed|warnings|failed/);

    const failed = job?.status === 'failed';
    // Failed reports surface their error via output.warnings[0] — the jobs/info endpoint
    // serialises via Report.toApiJSON() which does not expose the raw `error` field.
    return {
      failed,
      errorText: failed ? job?.output?.warnings?.[0] : undefined,
    };
  }
}
