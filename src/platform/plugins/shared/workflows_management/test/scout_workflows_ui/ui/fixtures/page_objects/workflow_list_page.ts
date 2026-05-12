/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Locator, ScoutPage } from '@kbn/scout';
import { PLUGIN_ID } from '../../../../../common';

export class WorkflowListPage {
  constructor(private readonly page: ScoutPage) {}

  /** Navigates to the workflows list page. */
  async navigate() {
    await this.page.gotoApp(PLUGIN_ID);
  }

  /** Returns the table row locator for the specified workflow. */
  getWorkflowRow(workflowName: string): Locator {
    return this.page.locator('tr').filter({ hasText: workflowName });
  }

  /** Returns the state toggle switch locator for the specified workflow. */
  getWorkflowStateToggle(workflowName: string, index: number = 0): Locator {
    const toggles = this.getWorkflowRow(workflowName).locator(
      '[data-test-subj^="workflowToggleSwitch-"]'
    );
    // eslint-disable-next-line playwright/no-nth-methods
    return toggles.nth(index);
  }

  /** Returns the checkbox locator for selecting the specified workflow. */
  getSelectCheckboxForWorkflow(workflowName: string, index: number = 0): Locator {
    const checkboxes = this.getWorkflowRow(workflowName).locator(
      'td:first-child input[type="checkbox"]'
    );
    // eslint-disable-next-line playwright/no-nth-methods
    return checkboxes.nth(index);
  }

  // Single Workflow Actions

  /** Returns the direct action button locator (run or edit) for the specified workflow. */
  getWorkflowAction(
    workflowName: string,
    action: 'runWorkflowAction' | 'editWorkflowAction',
    index: number = 0
  ): Locator {
    const actions = this.getWorkflowRow(workflowName).locator(`[data-test-subj="${action}"]`);
    // eslint-disable-next-line playwright/no-nth-methods
    return actions.nth(index);
  }

  /** Opens the three dots menu and returns the specified action button locator. */
  async getThreeDotsMenuAction(
    workflowName: string,
    action:
      | 'runWorkflowAction'
      | 'editWorkflowAction'
      | 'cloneWorkflowAction'
      | 'deleteWorkflowAction',
    index: number = 0
  ): Promise<Locator> {
    const buttons = this.getWorkflowRow(workflowName).locator(
      '[data-test-subj="euiCollapsedItemActionsButton"]'
    );
    // eslint-disable-next-line playwright/no-nth-methods
    await buttons.nth(index).click();
    return this.page.locator(`.euiContextMenuPanel [data-test-subj="${action}"]`);
  }

  // Bulk Actions

  /** Selects multiple workflows by clicking their checkboxes. */
  async selectWorkflows(workflowNamesToCheck: string[]) {
    for (const workflowName of workflowNamesToCheck) {
      await this.getSelectCheckboxForWorkflow(workflowName).click();
    }
  }

  /** Performs a bulk action (enable, disable, or delete) on selected workflows. */
  async performBulkAction(workflowNamesToCheck: string[], action: 'enable' | 'disable' | 'delete') {
    await this.selectWorkflows(workflowNamesToCheck);
    await this.page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'visible',
    });
    await this.page.testSubj.click('workflows-table-bulk-actions-button');
    await this.page.testSubj.click(`workflows-bulk-action-${action}`);
  }

  /** Returns workflow names in current table order (visible page only). */
  async getVisibleWorkflowNamesInOrder(): Promise<string[]> {
    await this.page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });
    const links = this.page.testSubj.locator('workflowListTable workflowNameLink');
    const texts = await links.allTextContents();
    return texts.map((t) => t.trim());
  }

  // Filter/Search/Sort
  async getFilterOption(filterName: 'enabled-filter-popover-button', optionName: string) {
    await this.page.testSubj.click(filterName);
    return this.page.locator('.euiSelectable li').filter({ hasText: optionName });
  }

  /** Returns the search field locator. */
  getSearchField(): Locator {
    return this.page.testSubj.locator('workflowSearchField');
  }

  // Import / Export actions

  /** Clicks the import workflows button in the toolbar. */
  async clickImportButton() {
    await this.page.testSubj.click('importWorkflowsButton');
  }

  /** Returns the import flyout locator. */
  getImportFlyout(): Locator {
    return this.page.testSubj.locator('importWorkflowsFlyout');
  }

  /** Sets a file on the import file picker input using an in-memory buffer. */
  async uploadFile(file: { name: string; mimeType: string; buffer: Buffer }) {
    const input = this.page.testSubj.locator('import-workflows-file-picker');
    await input.setInputFiles(file);
  }

  /** Returns the conflict callout locator. */
  getConflictCallout(): Locator {
    return this.page.testSubj.locator('import-workflows-conflicts');
  }

  /** Selects a conflict resolution option from the footer dropdown. */
  async selectConflictResolution(option: 'overwrite' | 'generateNewIds') {
    const select = this.page.testSubj.locator('import-workflows-conflict-resolution');
    await select.selectOption(option);
  }

  /** Clicks the import confirmation button. */
  async confirmImport() {
    await this.page.testSubj.click('import-workflows-confirm');
  }

  /** Clicks the import cancel button. */
  async cancelImport() {
    await this.page.testSubj.click('import-workflows-cancel');
  }

  /** Clicks the Close button shown after import completes. */
  async closeImport() {
    await this.page.testSubj.click('import-workflows-close');
  }

  /** Returns the Close button locator shown after import completes. */
  getImportCloseButton(): Locator {
    return this.page.testSubj.locator('import-workflows-close');
  }

  /** Returns the import result icon locator for a given workflow ID. */
  getImportResultIcon(workflowId: string, status: 'success' | 'failed'): Locator {
    return this.page.testSubj.locator(`import-preview-${status}-${workflowId}`);
  }

  /** Performs bulk export on the selected workflows. */
  async performBulkExport(workflowNames: string[]) {
    await this.selectWorkflows(workflowNames);
    await this.page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'visible',
    });
    await this.page.testSubj.click('workflows-table-bulk-actions-button');
    await this.page.testSubj.click('workflows-bulk-action-export');
  }

  /** Returns the export references modal locator. */
  getExportReferencesModal(): Locator {
    return this.page.testSubj.locator('export-references-modal');
  }

  /** Clicks the Ignore button in the export references modal. */
  async ignoreExportReferences() {
    await this.page.testSubj.click('export-references-ignore');
  }

  /** Clicks the Add referenced button in the export references modal. */
  async addDirectExportReferences() {
    await this.page.testSubj.click('export-references-add-direct');
  }

  /** Clicks the Add all referenced button in the export references modal. */
  async addAllExportReferences() {
    await this.page.testSubj.click('export-references-add-all');
  }
}
