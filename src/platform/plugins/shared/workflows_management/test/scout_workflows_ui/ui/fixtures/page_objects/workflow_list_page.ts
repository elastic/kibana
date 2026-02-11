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
  getWorkflowStateToggle(workflowName: string): Locator {
    return this.getWorkflowRow(workflowName).locator('[data-test-subj^="workflowToggleSwitch-"]');
  }

  /** Returns the checkbox locator for selecting the specified workflow. */
  getSelectCheckboxForWorkflow(workflowName: string): Locator {
    return this.getWorkflowRow(workflowName).locator('td:first-child input[type="checkbox"]');
  }

  // Single Workflow Actions

  /** Returns the direct action button locator (run or edit) for the specified workflow. */
  getWorkflowAction(
    workflowName: string,
    action: 'runWorkflowAction' | 'editWorkflowAction'
  ): Locator {
    return this.getWorkflowRow(workflowName).locator(`[data-test-subj="${action}"]`);
  }

  /** Opens the three dots menu and returns the specified action button locator. */
  async getThreeDotsMenuAction(
    workflowName: string,
    action:
      | 'runWorkflowAction'
      | 'editWorkflowAction'
      | 'cloneWorkflowAction'
      | 'deleteWorkflowAction'
  ): Promise<Locator> {
    await this.getWorkflowRow(workflowName)
      .locator('[data-test-subj="euiCollapsedItemActionsButton"]')
      .click();
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

  // Filter/Search/Sort
  async getFilterOption(filterName: 'enabled-filter-popover-button', optionName: string) {
    await this.page.testSubj.click(filterName);
    return this.page.locator('.euiSelectable li').filter({ hasText: optionName });
  }

  /** Returns the search field locator. */
  getSearchField(): Locator {
    return this.page.testSubj.locator('workflowSearchField');
  }
}
