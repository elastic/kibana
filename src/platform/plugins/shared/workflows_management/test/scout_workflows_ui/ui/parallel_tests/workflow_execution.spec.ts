/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, KibanaCodeEditorWrapper, tags, spaceTest as test } from '@kbn/scout';

const getTestRunWorkflowYaml = (name: string) => `
name: ${name}
enabled: false
description: This is a new workflow
triggers:
  - type: manual

inputs:
  - name: message
    type: string
    default: "hello world"

steps:
  - name: hello_world_step
    type: console
    with:
      message: "Test run: {{ execution.isTestRun }}"
`;

const getWorkflowWithLoopYaml = (name: string) => `
name: ${name}
enabled: false
description: This is a new workflow
triggers:
  - type: manual

inputs:
  - name: message
    type: string
    default: "hello world"

steps:
  - name: first_step
    type: console
    with:
      message: "This is the first step!"

  - name: loop
    type: foreach
    foreach: '[1,2,3,4]'
    steps:
      - name: hello_world_step
        type: console
        with:
          message: "Test run: {{ execution.isTestRun }}"
`;

test.describe('Workflow execution', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should run unsaved workflow as test run with isTestRun: true', async ({ page }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    // Step 1-3: Go to workflows page and create a new workflow
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');

    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    await expect(yamlEditor).toBeVisible();

    const yamlEditorWrapper = new KibanaCodeEditorWrapper(page);
    await yamlEditorWrapper.setCodeEditorValue(getTestRunWorkflowYaml(workflowName));

    // Step 4: Don't save - the workflow remains unsaved

    // Step 5: Hit run (play) button from the header
    await page.testSubj.click('runWorkflowHeaderButton');

    await page.testSubj.waitForSelector('runWorkflowWithUnsavedChangesConfirmationModal', {
      state: 'visible',
    });
    await page.testSubj.click('confirmModalConfirmButton');

    // Wait for execute modal to appear
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });

    // Click the execute button
    await page.testSubj.click('executeWorkflowButton');

    // Step 6.1: Verify redirected to workflow execution
    await page.waitForURL('**/workflows/*?executionId=*');

    // Step 6.2: Verify Test Workflow execution started
    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Step 6.3: Verify hello_world_step step outputs "Test run: true"
    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();

    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: true');
  });

  test('should run saved workflow from editor as test run with isTestRun: true', async ({
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    // Create and save a workflow
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');

    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    await expect(yamlEditor).toBeVisible();

    const yamlEditorWrapper = new KibanaCodeEditorWrapper(page);
    await yamlEditorWrapper.setCodeEditorValue(getTestRunWorkflowYaml(workflowName));

    // Step 7: Save the workflow
    await page.testSubj.click('saveWorkflowHeaderButton');
    await page.testSubj.waitForSelector('workflowSavedChangesBadge');

    // Step 8: Hit run (play) button from the header
    await page.testSubj.click('runWorkflowHeaderButton');

    // Wait for execute modal to appear
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });

    // Click the execute button
    await page.testSubj.click('executeWorkflowButton');

    // Step 9.1: Verify redirected to workflow execution
    await page.waitForURL('**/workflows/*?executionId=*');

    // Step 9.2: Verify Test Workflow execution started
    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Step 9.3: Verify hello_world_step step outputs "Test run: true"
    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();

    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: true');
  });

  test('should not allow running a disabled workflow, then enable and run it', async ({ page }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    // Step 1: Create workflow with enabled: false
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');

    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    await expect(yamlEditor).toBeVisible();

    const yamlEditorWrapper = new KibanaCodeEditorWrapper(page);
    await yamlEditorWrapper.setCodeEditorValue(getTestRunWorkflowYaml(workflowName));

    // Save the workflow
    await page.testSubj.click('saveWorkflowHeaderButton');
    await page.testSubj.waitForSelector('workflowSavedChangesBadge');

    // Step 2: Go to workflows list
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

    // Step 3: Find Test Workflow
    const workflowRow = page.testSubj
      .locator('workflowListTable')
      .getByRole('row', { name: workflowName });
    await expect(workflowRow).toBeVisible();

    // Step 4: Verify that Test Workflow is disabled
    // The switch should be unchecked (not checked)
    const toggleSwitch = workflowRow.locator('[data-test-subj^="workflowToggleSwitch-"]');
    await expect(toggleSwitch).not.toBeChecked();

    // Step 4.2: Verify Run button is not enabled for Test Workflow
    // The Run action button should be disabled (has 'euiButtonIcon-isDisabled' class)
    const runButton = workflowRow.getByRole('button', { name: 'Run' });
    await expect(runButton).toBeDisabled();

    // Step 5 & 7: Enable the workflow via the toggle
    await toggleSwitch.click();

    // Wait for the toggle to become checked (workflow is now enabled)
    await expect(toggleSwitch).toBeChecked();

    // Step 8: Hit run (play) button
    await runButton.click();

    // Wait for execute modal to appear
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });

    // Click the execute button
    await page.testSubj.click('executeWorkflowButton');

    // Step 9.1: Verify redirected to workflow execution
    await page.waitForURL('**/workflows/*?executionId=*');

    // Step 9.2: Verify Test Workflow execution started
    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Step 9.3: Verify hello_world_step step outputs "Test run: false"
    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();

    // Wait for step execution details to be visible and contain the expected output
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: false');
  });

  test('should run individual step with custom context override', async ({ page }) => {
    const workflowName = `Test Workflow with loop ${Math.floor(Math.random() * 10000)}`;

    // Step 1: Create workflow with loop
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');

    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    await expect(yamlEditor).toBeVisible();

    const codeEditorWrapper = new KibanaCodeEditorWrapper(page);
    await codeEditorWrapper.setCodeEditorValue(getWorkflowWithLoopYaml(workflowName));

    // focus editor
    await page.getByText('enabled: false').click();
    // Step 2: Put cursor on hello_world_step step
    // The step is nested inside the foreach loop, need to scroll to it first
    await page.keyboard.press('PageDown');
    await page.getByText('name: hello_world_step').click();
    await page.getByText('name: hello_world_step').click();
    await page.keyboard.press('End');

    // Step 3: Observe play button and hit it
    // Wait for the run step button to appear
    const runStepButton = page.testSubj.locator('runStep');
    await expect(runStepButton).toBeVisible();
    await runStepButton.click();

    // Step 4: Verify "Test step" modal is open
    await page.testSubj.waitForSelector('testStepModal', { state: 'visible' });

    // Step 4.2: Step inputs editor is present with predefined JSON having execution.isTestRun value
    const stepInputsEditor = page.testSubj.locator('workflow-event-json-editor');
    await expect(stepInputsEditor).toBeVisible();

    // Step 5: Update execution.isTestRun value to false
    // The editor should contain the step context - we need to modify the isTestRun value
    const inputEditorWrapper = new KibanaCodeEditorWrapper(page);
    await inputEditorWrapper.setCodeEditorValue(
      JSON.stringify({ execution: { isTestRun: false } }, null, 2)
    );

    // Step 6: Click "Run" button in the modal
    await page.testSubj.click('submit-step-run');

    // Step 7.1: Verify redirected to workflow execution
    await page.waitForURL('**/workflows/*?executionId=*');

    // Step 7.2: Verify only one hello_world_step step is executed
    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // There should be only one hello_world_step (not 4 from the loop)
    const helloWorldSteps = executionPanel.getByRole('button', { name: 'hello_world_step' });
    await expect(helloWorldSteps).toHaveCount(1);

    // Step 7.3: Step output is "Test run: false"
    await helloWorldSteps.click();

    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: false');
  });
});
