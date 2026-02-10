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

const getPrintAlertsWorkflowYaml = (name: string) => `
name: ${name}
enabled: true
description: Prints all received alerts
triggers:
 - type: manual
 - type: alert
steps:
 - name: log
   type: console
   foreach: \${{event.alerts}}
   with:
     message: \${{event}}
 - name: log_each_alert
   type: console
   foreach: \${{event.alerts}}
   with:
     message: \${{foreach.item}}
`;

const getCreateAlertRuleWorkflowYaml = (name: string) => `
name: ${name}
description: Create alert rule
enabled: true
triggers:
  - type: manual
inputs:
  - name: wf_multiple_alerts
    type: string
    required: true
  - name: wf_single_alert
    type: string
    required: true
consts:
  alerts_index_name: test-security-alerts-index
steps:
  - name: hello_world_step
    type: kibana.request
    with:
      method: POST
      path: /s/\{{workflow.spaceId}}/api/detection_engine/rules
      body:
        type: query
        index:
          - test-security-alerts-index
        filters: []
        language: kuery
        query: "not severity: foo"
        required_fields: []
        author: []
        false_positives: []
        references: []
        risk_score: 21
        risk_score_mapping: []
        severity: low
        severity_mapping: []
        threat: []
        max_signals: 100
        name: Security alert test
        description: Security alert test
        tags: []
        setup: ""
        license: ""
        interval: 15s
        from: now-20s
        to: now
        actions:
          - id: system-connector-.workflows
            params:
              subAction: run
              subActionParams:
                workflowId: "{{inputs.wf_single_alert}}"
                summaryMode: false
            action_type_id: .workflows
            uuid: b8bc90a9-2112-41c4-a797-bb6cbb52f5da
          - id: system-connector-.workflows
            params:
              subAction: run
              subActionParams:
                workflowId: "{{inputs.wf_multiple_alerts}}"
                summaryMode: true
            action_type_id: .workflows
            uuid: b8bc90a9-2112-41c4-a797-bb6cbb52f5da
        enabled: true
`;

const getTriggerAlertWorkflowYaml = (name: string) => `
name: ${name}
description: Add timestamp ingest pipeline, ingest docs, which will trigger the alert
enabled: true
triggers:
  - type: manual
consts:
  pipeline_name: add_timestamp_if_missing
  alerts_index_name: test-security-alerts-index
  alerts:
    - severity: high
      alert_id: bruteforce_login_attempt
      description: Multiple failed login attempts detected from IP 192.168.1.45 targeting admin account. 15 failures in 3 minutes exceeding threshold.
      category: authentication
      timestamp: 2023-11-15T08:23:45Z
    - severity: critical
      alert_id: suspicious_data_transfer
      description: Unusual outbound data transfer of 2.3GB to unrecognized external domain detected from workstation WS-0023. Transfer occurred outside business hours.
      category: data_exfiltration
      timestamp: 2023-11-15T09:17:32Z
steps:
  - name: create_ingest_pipeline
    type: elasticsearch.request
    on-failure:
      continue: true
    with:
      method: PUT
      path: _ingest/pipeline/add_timestamp_if_missing
      body:
        processors:
          - set:
              if: ctx['@timestamp'] == null
              field: "@timestamp"
              value: "{% raw %}{{_ingest.timestamp}}{% endraw %}"
  - name: index
    type: elasticsearch.request
    foreach: "{{consts.alerts}}"
    with:
      method: POST
      path: /{{consts.alerts_index_name}}/_doc?pipeline={{consts.pipeline_name}}
      body: \${{foreach.item}}
`;

test.describe('Workflow execution', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should run unsaved workflow as test run with isTestRun: true', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    // Step 1-3: Go to workflows page and create a new workflow
    await pageObjects.workflowEditor.gotoNewWorkflow();

    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));

    // Step 4: Don't save - the workflow remains unsaved

    // Step 5: Hit run (play) button from the header
    await pageObjects.workflowEditor.runWorkflowWithUnsavedChanges();

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
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    // Create and save a workflow
    await pageObjects.workflowEditor.gotoNewWorkflow();

    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));

    // Step 7: Save the workflow
    await pageObjects.workflowEditor.saveWorkflow();

    // Step 8: Hit run (play) button from the header
    await pageObjects.workflowEditor.clickRunButton();

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

  test('should not allow running a disabled workflow, then enable and run it', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow ${Math.floor(Math.random() * 10000)}`;

    // Step 1: Create workflow with enabled: false
    await pageObjects.workflowEditor.gotoNewWorkflow();

    await pageObjects.workflowEditor.setYamlEditorValue(getTestRunWorkflowYaml(workflowName));

    // Save the workflow
    await pageObjects.workflowEditor.saveWorkflow();

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

  test('should run individual step with custom context override', async ({ pageObjects, page }) => {
    const workflowName = `Test Workflow with loop ${Math.floor(Math.random() * 10000)}`;

    // Step 1: Create workflow with loop
    await pageObjects.workflowEditor.gotoNewWorkflow();

    await pageObjects.workflowEditor.setYamlEditorValue(getWorkflowWithLoopYaml(workflowName));

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

    // Step 4: Verify "Test step" modal is open and set inputs
    await pageObjects.workflowEditor.setTestStepInputs({ execution: { isTestRun: false } });

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

  test('should display execution tree with foreach loops showing multiple iterations', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Test Workflow with loop ${Math.floor(Math.random() * 10000)}`;

    // Step 1: Create workflow with foreach loop
    const workflowYaml = `
name: ${workflowName}
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
    foreach: '[1,2]'
    steps:
      - name: log_iteration
        type: console
        with:
          message: "Iteration is {{foreach.index}}"
`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(workflowYaml);

    // Save the workflow first to avoid unsaved changes dialog
    await pageObjects.workflowEditor.saveWorkflow();

    // Step 2: Observe play button and hit it
    await pageObjects.workflowEditor.clickRunButton();

    // Step 3: In "Test workflow" modal, update "message" input with some value
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await pageObjects.workflowEditor.setExecuteModalInputs({ message: 'test message' });

    // Click the execute button
    await page.testSubj.click('executeWorkflowButton');

    // Step 4.1: Verify workflow execution is started
    await page.waitForURL('**/workflows/*?executionId=*');

    // Step 4.2: Verify the user is redirected to the execution
    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Step 5: Wait for the execution to finish
    // Wait for the execution to complete by checking the status badge
    const statusBadge = page.testSubj.locator('workflowExecutionStatus');
    await expect(statusBadge).toContainText(/success|completed/i, { timeout: 30000 });

    // Reloading page to see all step executions expanded
    await page.reload();

    // Step 6.1: Verify Workflow execution section contains Overview
    const overviewSection = page.testSubj.locator('workflowExecutionOverview');
    await expect(overviewSection).toBeVisible();

    // Step 6.1.1: Verify when workflow started
    await expect(overviewSection.getByText('Execution started')).toBeVisible();

    // Step 6.1.2: Verify when workflow ended
    await expect(overviewSection.getByText('Execution ended')).toBeVisible();

    // Step 6.2.1: Verify Manual run
    await executionPanel.getByText('Manual').click();

    // Step 6.2: Verify Trigger section
    const triggerSection = page.testSubj.locator('workflowExecutionTrigger');
    await expect(triggerSection).toBeVisible();

    // Step 6.2.2: Verify displays the inputs entered through "Test workflow" modal
    await expect(triggerSection.getByText('test message')).toBeVisible();

    // Step 6.3: Verify Steps execution tree
    // Step 6.3.1: Verify 1 execution of first_step
    const firstStepButton = executionPanel.getByRole('button', { name: 'first_step' });
    await expect(firstStepButton).toHaveCount(1);

    // Step 6.3.2: Verify 1 execution of "loop" step
    const loopStepButton = executionPanel.getByRole('button', { name: 'loop' });
    await loopStepButton.click();
    await expect(loopStepButton).toHaveCount(1);

    // Step 6.3.3: Verify 2 executions of log_iteration step
    const logIterationButtons = executionPanel.getByRole('button', { name: 'log_iteration' });
    await expect(logIterationButtons).toHaveCount(2);

    // Step 7: Click each log_iteration step
    // Step 8: Verify each log_iteration step outputs the corresponding iteration
    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    const firstIteration = logIterationButtons.first();
    await firstIteration.click();

    let stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Iteration is 0');

    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    const secondIteration = logIterationButtons.last();
    await secondIteration.click();

    stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
    await expect(stepDetails.getByTestId('jsonDataTable')).toContainText('Iteration is 1');
  });

  test('should display scrollable step executions with many iterations', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Scroll test workflow ${Math.floor(Math.random() * 10000)}`;

    // Step 1: Create workflow with many foreach iterations
    const workflowYaml = `
name: ${workflowName}
enabled: false
description: This is a new workflow
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type: console
    foreach: '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]'
    with:
      message: "Hello world"
`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(workflowYaml);

    // Save the workflow first to avoid unsaved changes dialog
    await pageObjects.workflowEditor.saveWorkflow();

    // Step 2: Run workflow
    await pageObjects.workflowEditor.clickRunButton();

    await page.waitForURL('**/workflows/*?executionId=*');

    const executionPanel = page.testSubj.locator('workflowExecutionPanel');
    await expect(executionPanel).toBeVisible();

    // Wait for execution to complete
    const statusBadge = page.testSubj.locator('workflowExecutionStatus');
    await expect(statusBadge).toContainText(/success|completed/i, { timeout: 60000 });

    // Reloading page to see all step executions expanded
    await page.reload();

    // Verify we have 50 step executions (the foreach array has 50 items)
    // Use negative lookahead to exclude the parent foreach step
    const stepButtons = executionPanel.getByRole('button', {
      name: /^(?!foreach_).*hello_world_step/,
    });
    await expect(stepButtons).toHaveCount(50);

    // Verify the container is scrollable by checking if not all items are visible at once
    // Get the first and last step execution buttons
    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    const firstStep = stepButtons.first();
    // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
    const lastStep = stepButtons.last();

    // First step should be visible
    await expect(firstStep).toBeVisible();

    // Last step might not be visible initially (need to scroll)
    // Scroll the execution panel to see the last step
    await lastStep.scrollIntoViewIfNeeded();
    await expect(lastStep).toBeVisible();
  });

  // TODO: delete the alert rule, and workflows after the test
  test('should trigger workflow from alert', async ({ pageObjects, page, browserAuth }) => {
    // we need admin privileges to write to the test index
    await browserAuth.loginAsAdmin();

    const singleWorkflowName = `Handle single alert ${Math.floor(Math.random() * 10000)}`;
    const multipleWorkflowName = `Handle multiple alerts ${Math.floor(Math.random() * 10000)}`;
    const createAlertRuleWorkflowName = `Create alert rule workflow ${Math.floor(
      Math.random() * 10000
    )}`;
    const triggerAlertWorkflowName = `Trigger alert workflow ${Math.floor(Math.random() * 10000)}`;
    // Step 1: Create workflow with alert trigger
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getPrintAlertsWorkflowYaml(singleWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();

    const singleWorkflowId = page.url().match(/workflows\/([^\/]+)/)?.[1];

    // Step 2: Create workflow with alert trigger, which print all alerts in context for multiple setting
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getPrintAlertsWorkflowYaml(multipleWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();

    const multipleWorkflowId = page.url().match(/workflows\/([^\/]+)/)?.[1];

    // Step 3: Create an alert rule via a workflow (FIX: not working, can't see the created alert rule in the Security/Alerts page)
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getCreateAlertRuleWorkflowYaml(createAlertRuleWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();
    // Run the workflow to create the alert rule, specifying the workflow IDs to trigger
    await pageObjects.workflowEditor.executeWorkflowWithInputs({
      wf_single_alert: singleWorkflowId,
      wf_multiple_alerts: multipleWorkflowId,
    });

    // Wait for execution to complete
    const statusBadge = page.testSubj.locator('workflowExecutionStatus');
    await expect(statusBadge).toContainText(/success|completed/i, { timeout: 60000 });

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getTriggerAlertWorkflowYaml(triggerAlertWorkflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();
    await pageObjects.workflowEditor.clickRunButton();

    // Wait for execution to complete
    const statusBadge2 = page.testSubj.locator('workflowExecutionStatus');
    await expect(statusBadge2).toContainText(/success|completed/i, { timeout: 60000 });

    // Step 2: Go to workflows list
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

    await page.testSubj
      .locator('workflowListTable')
      .getByRole('link', { name: singleWorkflowName })
      .click();
    await page.getByRole('button', { name: 'Executions' }).click();

    await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });

    const executionItems = page.testSubj.locator('workflowExecutionListItem');
    await expect(executionItems).toHaveCount(2, { timeout: 60000 });

    // await executionItems.first().click();
    // await pageObjects.workflowEditor.expandStepsTree();

    // const logEachAlertStep1 = await pageObjects.workflowEditor.getStep(
    //   'foreach_log_each_alert > 0 > log_each_alert'
    // );
    // await logEachAlertStep1.click();
    // const output1 = await pageObjects.workflowEditor.getStepResultJson('output');
    // expect(output1).toContain({
    //   description:
    //     'Unusual outbound data transfer of 2.3GB to unrecognized external domain detected from workstation WS-0023. Transfer occurred outside business hours.',
    // });

    // await page.testSubj.locator('backToExecutionsLink').click();

    // await executionItems.last().click();

    // const logEachAlertStep2 = await pageObjects.workflowEditor.getStep('log_each_alert');
    // await logEachAlertStep2.click();
    // const output2 = await pageObjects.workflowEditor.getStepResultJson('output');
    // expect(output2).toContain({
    //   description:
    //     'Multiple failed login attempts detected from IP 192.168.1.45 targeting admin account. 15 failures in 3 minutes exceeding threshold.',
    // });

    // await page.testSubj.waitForSelector('workflowExecutionPanel', { state: 'visible' });

    // const logEachExecutions = page.testSubj
    //   .locator('workflowExecutionPanel')
    //   .getByRole('button', { name: 'log_each_alert' });
    // await expect(logEachExecutions).toHaveCount(1);

    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

    await page.testSubj
      .locator('workflowListTable')
      .getByRole('link', { name: multipleWorkflowName })
      .click();
    await page.getByRole('button', { name: 'Executions' }).click();

    await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });

    const executionItems2 = page.testSubj.locator('workflowExecutionListItem');
    await expect(executionItems2).toHaveCount(1, { timeout: 60000 });
  });
});
