/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, KibanaCodeEditorWrapper, type Locator, type ScoutPage } from '@kbn/scout';

export class WorkflowListPage {
  constructor(private readonly page: ScoutPage) {}

  async navigate() {
    await this.page.gotoApp('workflows');
  }

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

  async selectWorkflows(workflowNamesToCheck: string[]) {
    await this.navigate();

    for (const workflowName of workflowNamesToCheck) {
      await this.page
        .locator('tr')
        .filter({ hasText: workflowName })
        .locator('td:first-child input[type="checkbox"]')
        .check();
    }
  }

  async performBulkAction(workflowNamesToCheck: string[], action: 'enable' | 'disable' | 'delete') {
    await this.selectWorkflows(workflowNamesToCheck);
    await this.page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'visible',
    });
    await this.page.testSubj.click('workflows-table-bulk-actions-button');
    await this.page.testSubj.click(`workflows-bulk-action-${action}`);
  }

  async getThreeDotsMenuAction(
    workflowName: string,
    action:
      | 'runWorkflowAction'
      | 'editWorkflowAction'
      | 'cloneWorkflowAction'
      | 'deleteWorkflowAction'
  ) {
    await this.page
      .locator('tr')
      .filter({ hasText: workflowName })
      .locator('[data-test-subj="euiCollapsedItemActionsButton"]')
      .click();
    return this.page.locator(`.euiContextMenuPanel button[data-test-subj="${action}"]`);
  }

  async getWorkflowAction(
    workflowName: string,
    action: 'runWorkflowAction' | 'editWorkflowAction'
  ) {
    return this.page
      .locator('tr')
      .filter({ hasText: workflowName })
      .locator(`[data-test-subj="${action}"]`);
  }

  async getSelectCheckboxForWorkflow(workflowName: string) {
    return this.page
      .locator('tr')
      .filter({ hasText: workflowName })
      .locator('td:first-child input[type="checkbox"]');
  }

  async getWorkflowStateToggle(workflowName: string): Promise<Locator> {
    return this.page
      .locator('tr')
      .filter({ hasText: workflowName })
      .locator('[data-test-subj^="workflowToggleSwitch-"]');
  }
}
