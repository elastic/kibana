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
  public yamlEditor: Locator;
  public saveButton: Locator;
  public runButton: Locator;
  public validationErrorsAccordion: Locator;

  constructor(private readonly page: ScoutPage) {
    this.yamlEditor = this.page.testSubj.locator('workflowYamlEditor');
    this.saveButton = this.page.testSubj.locator('saveWorkflowHeaderButton');
    this.runButton = this.page.testSubj.locator('runWorkflowHeaderButton');
    this.validationErrorsAccordion = this.page.testSubj.locator(
      'wf-yaml-editor-validation-errors-list'
    );
  }

  async createDummyWorkflows(workflows: { name: string; description: string; enabled: boolean }[]) {
    for (const workflow of workflows) {
      await this.page.gotoApp('workflows');
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
    await this.page.gotoApp('workflows');

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

  async getSelectCheckboxForWorkflow(workflowName: string) {
    return this.page
      .locator('tr')
      .filter({ hasText: workflowName })
      .locator('td:first-child input[type="checkbox"]');
  }

  async getWorkflowEnabledToggle(workflowName: string): Promise<Locator> {
    return this.page
      .locator('tr')
      .filter({ hasText: workflowName })
      .locator('[data-test-subj^="workflowToggleSwitch-"]');
  }
}
