/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { KibanaCodeEditorWrapper, type Locator, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class WorkflowListPage {
  constructor(private readonly page: ScoutPage) {}

  // Navigation

  /** Navigates to the workflows list page. */
  async navigate() {
    await this.page.gotoApp('workflows');
  }

  // Workflow Creation

  /** Creates multiple dummy workflows with the specified properties. */
  async createDummyWorkflows(workflows: { name: string; description: string; enabled: boolean }[]) {
    for (const workflow of workflows) {
      await this.navigate();
      await this.page.testSubj.click('createWorkflowButton');

      const yamlEditor = this.page.testSubj.locator('workflowYamlEditor');
      await expect(yamlEditor).toBeVisible();

      const yamlEditorWrapper = new KibanaCodeEditorWrapper(this.page);
      const dummyWorkflow = `
name: ${workflow.name}
enabled: ${workflow.enabled}
description: ${workflow.description}
triggers:
  - type: manual

steps:
  - name: hello_world_step
    type: console
    with:
      message: "Test run: {{ execution.isTestRun }}"
`;
      await yamlEditorWrapper.setCodeEditorValue(dummyWorkflow);
      await this.page.testSubj.click('saveWorkflowHeaderButton');
      await this.page.testSubj.waitForSelector('workflowSavedChangesBadge');
    }
  }

  // Workflow Locators

  /** Returns the table row locator for the specified workflow. */
  async getWorkflowRow(workflowName: string) {
    return this.page.locator('tr').filter({ hasText: workflowName });
  }

  /** Returns the state toggle switch locator for the specified workflow. */
  async getWorkflowStateToggle(workflowName: string): Promise<Locator> {
    return this.getWorkflowRow(workflowName).then((row) =>
      row.locator('[data-test-subj^="workflowToggleSwitch-"]')
    );
  }

  /** Returns the checkbox locator for selecting the specified workflow. */
  async getSelectCheckboxForWorkflow(workflowName: string) {
    return this.getWorkflowRow(workflowName).then((row) =>
      row.locator('td:first-child input[type="checkbox"]')
    );
  }

  // Single Workflow Actions

  /** Returns the direct action button locator (run or edit) for the specified workflow. */
  async getWorkflowAction(
    workflowName: string,
    action: 'runWorkflowAction' | 'editWorkflowAction'
  ) {
    return this.getWorkflowRow(workflowName).then((row) =>
      row.locator(`[data-test-subj="${action}"]`)
    );
  }

  /** Opens the three dots menu and returns the specified action button locator. */
  async getThreeDotsMenuAction(
    workflowName: string,
    action:
      | 'runWorkflowAction'
      | 'editWorkflowAction'
      | 'cloneWorkflowAction'
      | 'deleteWorkflowAction'
  ) {
    (await this.getWorkflowRow(workflowName))
      .locator('[data-test-subj="euiCollapsedItemActionsButton"]')
      .click();
    return this.page.locator(`.euiContextMenuPanel [data-test-subj="${action}"]`);
  }

  // Bulk Actions

  /** Selects multiple workflows by clicking their checkboxes. */
  async selectWorkflows(workflowNamesToCheck: string[]) {
    await this.navigate();

    for (const workflowName of workflowNamesToCheck) {
      await this.getSelectCheckboxForWorkflow(workflowName).then((locator) => locator.click());
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

  async getSearchField() {
    return this.page.testSubj.locator('workflowSearchField');
  }
}
