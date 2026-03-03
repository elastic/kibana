/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { getTestRunWorkflowYaml, getWorkflowWithLoopYaml } from '../../fixtures/workflows';

test.describe('Workflow execution - Test runs', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should run unsaved workflow as test run with isTestRun: true', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = 'Test Workflow Unsaved';

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));

    // Run without saving -- should prompt for unsaved changes confirmation
    await pageObjects.workflowEditor.runWorkflowWithUnsavedChanges();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await pageObjects.workflowExecution.waitForExecutionView();

    await pageObjects.workflowExecution.executionPanel
      .getByRole('button', { name: 'hello_world_step' })
      .click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('workflowJsonDataViewer')).toContainText('Test run: true');
  });

  test('should run saved workflow from editor as test run with isTestRun: true', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = 'Test Workflow Saved';

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await pageObjects.workflowExecution.waitForExecutionView();

    await pageObjects.workflowExecution.executionPanel
      .getByRole('button', { name: 'hello_world_step' })
      .click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('workflowJsonDataViewer')).toContainText('Test run: true');
  });

  test('should not allow running a disabled workflow, then enable and run it', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = 'Test Workflow Disabled Then Enabled';

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    // Navigate to list and verify the workflow is disabled
    await pageObjects.workflowList.navigate();
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

    const workflowRow = pageObjects.workflowList.getWorkflowRow(workflowName);
    await expect(workflowRow).toBeVisible();

    const toggleSwitch = workflowRow.locator('[data-test-subj^="workflowToggleSwitch-"]');
    await expect(toggleSwitch).not.toBeChecked();

    const runButton = workflowRow.getByRole('button', { name: 'Run' });
    await expect(runButton).toBeDisabled();

    // Enable the workflow via toggle and verify Run becomes available
    await toggleSwitch.click();
    await expect(toggleSwitch).toBeChecked();

    await runButton.click();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await pageObjects.workflowExecution.waitForExecutionView();

    // Not a test run since we ran from the list (enabled workflow), so isTestRun: false
    await pageObjects.workflowExecution.executionPanel
      .getByRole('button', { name: 'hello_world_step' })
      .click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('workflowJsonDataViewer')).toContainText(
      'Test run: false'
    );
  });

  test('should run individual step with custom context override', async ({ pageObjects, page }) => {
    const workflowName = 'Test Workflow Step Override';

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getWorkflowWithLoopYaml(workflowName));

    // Navigate to the step and click the inline "run step" button.
    // navigateToYamlLine waits for the run-step button to appear, which
    // confirms the debounced YAML computation has completed.
    await pageObjects.workflowEditor.setCursorToText('name: hello_world_step');
    await page.testSubj.click('workflowRunStep');

    // Set custom context in the test step modal and execute§
    await pageObjects.workflowEditor.setTestStepInputs({
      execution: { isTestRun: false },
      foreach: { item: { '@timestamp': 'now' } },
    });
    await page.testSubj.click('workflowSubmitStepRun');

    await pageObjects.workflowExecution.waitForExecutionView();

    // Only one hello_world_step should run (not 4 from the loop)
    const helloWorldSteps = pageObjects.workflowExecution.executionPanel.getByRole('button', {
      name: 'hello_world_step',
    });
    await expect(helloWorldSteps).toHaveCount(1);

    await helloWorldSteps.click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('workflowJsonDataViewer')).toContainText(
      'Test run: false, timestamp: now'
    );
  });
});
