/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, KibanaCodeEditorWrapper, tags, spaceTest as test } from '@kbn/scout';

const getDummyWorkflowYaml = (name: string) => `
name: ${name}
description: Dummy workflow description
enabled: true
inputs:
  - name: message
    type: string
    default: "hello world"
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type: console
    with:
      message: "{{ inputs.message }}"
`;

const getInvalidWorkflowYaml = (name: string) => `
name: ${name}
description: Invalid workflow - missing steps
enabled: true
triggers:
  - type: manual
`;

test.describe('Sanity tests for workflows', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('Create, save, run and view a dummy workflow', async ({ page }) => {
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');
    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    const yamlEditorWrapper = new KibanaCodeEditorWrapper(page);
    await expect(yamlEditor).toBeVisible();

    const workflowName = `Dummy workflow ${Math.floor(Math.random() * 1000)}`;

    // Set the editor value
    await yamlEditorWrapper.setCodeEditorValue(getDummyWorkflowYaml(workflowName));

    // Now the save button should be enabled and clicking it will save the correct value
    await page.testSubj.click('saveWorkflowHeaderButton');
    await page.testSubj.waitForSelector('workflowSavedChangesBadge');
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

    const workflowRow = page.testSubj
      .locator('workflowListTable')
      .getByRole('row', { name: workflowName });
    await expect(workflowRow).toBeVisible();
    await workflowRow.getByLabel('Run').click();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });

    const inputEditor = page.testSubj.locator('workflow-manual-json-editor');
    await expect(inputEditor).toBeVisible();
    const inputEditorWrapper = new KibanaCodeEditorWrapper(page);
    await inputEditorWrapper.setCodeEditorValue('{"message": "Hello Kibana"}');
    await page.testSubj.click('executeWorkflowButton');

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();

    await expect(
      page.testSubj.locator('workflowStepExecutionDetails').getByTestId('jsonDataTable')
    ).toContainText('Hello Kibana');
  });

  test('should show validation errors for invalid workflow YAML and clear them when fixed', async ({
    page,
  }) => {
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');

    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    await expect(yamlEditor).toBeVisible();

    const workflowName = `Invalid workflow ${Math.floor(Math.random() * 1000)}`;
    const yamlEditorWrapper = new KibanaCodeEditorWrapper(page);
    await yamlEditorWrapper.setCodeEditorValue(getInvalidWorkflowYaml(workflowName));

    // Wait for validation to complete and show errors
    const validationAccordion = page.getByTestId('wf-yaml-editor-validation-errors-list');
    await expect(validationAccordion).toBeVisible();
    await expect(validationAccordion).toContainText('error');

    // Click to expand the accordion and verify the specific error message
    await validationAccordion.getByRole('button', { name: 'error' }).click();
    await expect(validationAccordion.getByText('missing property "steps"')).toBeVisible();

    // Fix the workflow by pasting valid YAML
    await yamlEditorWrapper.setCodeEditorValue(getDummyWorkflowYaml(workflowName));

    // Validation errors should disappear
    await expect(validationAccordion).toContainText('No validation errors');
  });
});
