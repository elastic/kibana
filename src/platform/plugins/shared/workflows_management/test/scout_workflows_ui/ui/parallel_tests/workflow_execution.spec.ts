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
import { spaceTest as test } from '../fixtures';
import { cleanupWorkflowsAndRules } from '../fixtures/cleanup';
import { ALERT_PROPAGATION_TIMEOUT, EXECUTION_TIMEOUT } from '../fixtures/constants';
import {
  getCreateAlertRuleWorkflowYaml,
  getIterationLoopWorkflowYaml,
  getManyIterationsWorkflowYaml,
  getPrintAlertsWorkflowYaml,
  getTestRunWorkflowYaml,
  getTriggerAlertWorkflowYaml,
  getWorkflowWithLoopYaml,
} from '../fixtures/workflows';

test.describe('Workflow execution', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices, kbnClient }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices, kbnClient });
  });

  test('should run unsaved workflow as test run with isTestRun: true', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));

    // Run without saving -- should prompt for unsaved changes confirmation
    await pageObjects.workflowEditor.runWorkflowWithUnsavedChanges();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: true');
  });

  test('should run saved workflow from editor as test run with isTestRun: true', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: true');
  });

  test('should not allow running a disabled workflow, then enable and run it', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    // Navigate to list and verify the workflow is disabled
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

    const workflowRow = page.testSubj
      .locator('workflowListTable')
      .getByRole('row', { name: workflowName });
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

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Not a test run since we ran from the list (enabled workflow), so isTestRun: false
    await executionPanel.getByRole('button', { name: 'hello_world_step' }).click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: false');
  });

  test('should run individual step with custom context override', async ({ pageObjects, page }) => {
    const workflowName = `Test Workflow with loop ${Math.floor(Math.random() * 10000)}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getWorkflowWithLoopYaml(workflowName));

    // Navigate to the nested hello_world_step in the editor
    await page.getByText('enabled: false').click();
    await page.keyboard.press('PageDown');
    await page.getByText('name: hello_world_step').click();
    await page.getByText('name: hello_world_step').click();
    await page.keyboard.press('End');

    // Click the inline "run step" button
    const runStepButton = page.testSubj.locator('runStep');
    await expect(runStepButton).toBeVisible();
    await runStepButton.click();

    // Set custom context in the test step modal and execute
    await pageObjects.workflowEditor.setTestStepInputs({ execution: { isTestRun: false } });
    await page.testSubj.click('submit-step-run');

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Only one hello_world_step should run (not 4 from the loop)
    const helloWorldSteps = executionPanel.getByRole('button', { name: 'hello_world_step' });
    await expect(helloWorldSteps).toHaveCount(1);

    await helloWorldSteps.click();
    const stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Test run: false');
  });

  test('should display execution tree with foreach loops showing multiple iterations', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow with loop ${Math.floor(Math.random() * 10000)}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getIterationLoopWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    // Run with custom input
    await pageObjects.workflowEditor.clickRunButton();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await pageObjects.workflowEditor.setExecuteModalInputs({ message: 'test message' });
    await page.testSubj.click('executeWorkflowButton');

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    // Verify overview section
    const overviewSection = page.testSubj.locator('workflowExecutionOverview');
    await expect(overviewSection).toBeVisible();
    await expect(overviewSection.getByText('Execution started')).toBeVisible();
    await expect(overviewSection.getByText('Execution ended')).toBeVisible();

    await pageObjects.workflowExecution.expandStepsTree();

    // Verify trigger section shows the manual input
    await executionPanel.getByText('Manual').click();
    const triggerSection = page.testSubj.locator('workflowExecutionTrigger');
    await expect(triggerSection).toBeVisible();
    await expect(triggerSection.getByText('test message')).toBeVisible();

    // Verify execution tree structure
    const firstStepButton = executionPanel.getByRole('button', { name: 'first_step' });
    await expect(firstStepButton).toHaveCount(1);

    const loopStepButton = executionPanel.getByRole('button', { name: 'loop' });
    await loopStepButton.click();
    await expect(loopStepButton).toHaveCount(1);

    // Verify foreach produced 2 iterations
    const logIterationButtons = executionPanel.getByRole('button', { name: 'log_iteration' });
    await expect(logIterationButtons).toHaveCount(2);

    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    await logIterationButtons.first().click();
    let stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Iteration is 0');

    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    await logIterationButtons.last().click();
    stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Iteration is 1');
  });

  test('should display scrollable step executions with many iterations', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Scroll test workflow ${Math.floor(Math.random() * 10000)}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getManyIterationsWorkflowYaml(workflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    await pageObjects.workflowExecution.expandStepsTree();

    // Verify 50 leaf step executions (exclude the parent foreach step)
    const stepButtons = executionPanel.getByRole('button', {
      name: /^(?!foreach_).*hello_world_step/,
    });
    await expect(stepButtons).toHaveCount(50);

    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    const firstStep = stepButtons.first();
    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    const lastStep = stepButtons.last();

    await expect(firstStep).toBeVisible();

    // Scroll to the last step to verify scrollability
    await lastStep.scrollIntoViewIfNeeded();
    await expect(lastStep).toBeVisible();
  });

  test('should trigger workflow from alert', async ({ pageObjects, page, browserAuth }) => {
    // Admin privileges needed to write to the test index and create detection rules
    await browserAuth.loginAsAdmin();

    const singleWorkflowName = `Handle single alert ${Math.floor(Math.random() * 10000)}`;
    const multipleWorkflowName = `Handle multiple alerts ${Math.floor(Math.random() * 10000)}`;
    const createAlertRuleWorkflowName = `Create alert rule workflow ${Math.floor(
      Math.random() * 10000
    )}`;
    const triggerAlertWorkflowName = `Trigger alert workflow ${Math.floor(Math.random() * 10000)}`;
    const mockAlerts = [
      {
        severity: 'high',
        alert_id: 'bruteforce_login_attempt',
        description:
          'Multiple failed login attempts detected from IP 192.168.1.45 targeting admin account. 15 failures in 3 minutes exceeding threshold.',
        category: 'authentication',
        timestamp: '2023-11-15T08:23:45Z',
      },
      {
        severity: 'critical',
        alert_id: 'suspicious_data_transfer',
        description:
          'Unusual outbound data transfer of 2.3GB to unrecognized external domain detected from workstation WS-0023. Transfer occurred outside business hours.',
        category: 'data_exfiltration',
        timestamp: '2023-11-15T09:17:32Z',
      },
    ];

    // Create single-alert target workflow (summaryMode: false)
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getPrintAlertsWorkflowYaml(singleWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();
    const singleWorkflowId = page.url().match(/workflows\/([^\/]+)/)?.[1];

    // Create multiple-alerts target workflow (summaryMode: true)
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getPrintAlertsWorkflowYaml(multipleWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();
    const multipleWorkflowId = page.url().match(/workflows\/([^\/]+)/)?.[1];

    // Create and run the alert rule creation workflow
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getCreateAlertRuleWorkflowYaml(createAlertRuleWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();
    await pageObjects.workflowEditor.executeWorkflowWithInputs({
      wf_single_alert: singleWorkflowId,
      wf_multiple_alerts: multipleWorkflowId,
    });

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    // Create and run the alert trigger workflow (indexes docs that fire the rule)
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getTriggerAlertWorkflowYaml(triggerAlertWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();
    await pageObjects.workflowEditor.executeWorkflowWithInputs({ alerts: mockAlerts });

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    // Validate single-alert workflow executions (one alert per execution)
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });
    await page.testSubj
      .locator('workflowListTable')
      .getByRole('link', { name: singleWorkflowName })
      .click();
    await page.getByRole('button', { name: 'Executions' }).click();
    await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });

    const executionItems = page.testSubj.locator('workflowExecutionListItem');
    await expect(executionItems).toHaveCount(2, { timeout: ALERT_PROPAGATION_TIMEOUT });

    // Most recent execution first -> last alert first
    const expectedSingleAlertDescriptions = [
      'suspicious_data_transfer',
      'bruteforce_login_attempt',
    ];

    for (let i = 0; i < 2; i++) {
      // eslint-disable-next-line playwright/no-nth-methods -- iterating over execution list items by index
      await executionItems.nth(i).click();

      const executionPanel = page.testSubj.locator('workflowExecutionPanel');
      await expect(executionPanel).toBeVisible();
      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
      await pageObjects.workflowExecution.expandStepsTree();

      // Only 1 iteration per execution (single-alert mode)
      const logEachAlertButtons = executionPanel.getByRole('button', {
        name: /^log_each_alert/,
      });
      await expect(logEachAlertButtons).toHaveCount(1);
      // eslint-disable-next-line playwright/no-nth-methods
      await logEachAlertButtons.first().click();

      const stepOutput = await pageObjects.workflowExecution.getStepResultJson<unknown>('output');
      expect(JSON.stringify(stepOutput)).toContain(expectedSingleAlertDescriptions[i]);

      await page.testSubj.click('backToExecutionsLink');
      await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });
    }

    // Validate multiple-alerts workflow execution (all alerts in one execution)
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });
    await page.testSubj
      .locator('workflowListTable')
      .getByRole('link', { name: multipleWorkflowName })
      .click();
    await page.getByRole('button', { name: 'Executions' }).click();
    await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });

    const executionItems2 = page.testSubj.locator('workflowExecutionListItem');
    await expect(executionItems2).toHaveCount(1, { timeout: ALERT_PROPAGATION_TIMEOUT });

    // eslint-disable-next-line playwright/no-nth-methods
    await executionItems2.first().click();

    const executionPanel2 = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel2).toBeVisible();
    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
    await pageObjects.workflowExecution.expandStepsTree();

    // 2 iterations (both alerts in single execution)
    const logEachAlertButtons2 = executionPanel2.getByRole('button', {
      name: /^log_each_alert/,
    });
    await expect(logEachAlertButtons2).toHaveCount(2);

    const expectedAlertIds = ['bruteforce_login_attempt', 'suspicious_data_transfer'];

    for (let i = 0; i < expectedAlertIds.length; i++) {
      // eslint-disable-next-line playwright/no-nth-methods -- iterating over foreach iterations by index
      await logEachAlertButtons2.nth(i).click();

      const alertOutput = await pageObjects.workflowExecution.getStepResultJson<unknown>('output');
      expect(JSON.stringify(alertOutput)).toContain(expectedAlertIds[i]);
    }
  });
});
