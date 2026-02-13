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
import { ALERT_PROPAGATION_TIMEOUT, EXECUTION_TIMEOUT } from '../../fixtures/constants';
import {
  getCreateObsAlertRuleWorkflowYaml,
  getCreateSecurityAlertRuleWorkflowYaml,
  getPrintAlertsWorkflowYaml,
  getTriggerAlertWorkflowYaml,
  TEST_ALERTS_INDEX,
} from '../../fixtures/workflows';

/**
 * Returns the correct "create alert rule" workflow YAML based on the project type.
 * - Security: uses the detection engine API
 * - Observability / ESS: uses the generic Kibana alerting API with .es-query rule type
 */
const getCreateAlertRuleWorkflow = (projectType: string | undefined) => {
  if (projectType === 'security') {
    return getCreateSecurityAlertRuleWorkflowYaml;
  }
  return getCreateObsAlertRuleWorkflowYaml;
};

// Alert trigger tests run on Security and Observability (and ESS), but NOT on Elasticsearch/Search.
// Security uses the detection engine API; Observability uses the generic alerting API.
// FLAKY: https://github.com/elastic/kibana/issues/252959
test.describe.skip(
  'Workflow execution - Alert triggers',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      // Custom role with extra privileges beyond the default editor:
      // 1. Write to test index (workflow indexes alert docs to trigger the rule)
      // 2. Create ingest pipelines (workflow creates add_timestamp_if_missing pipeline)
      // Detection/alerting rule creation uses kibana.request, so Kibana 'all' base privilege covers it.
      await browserAuth.loginWithCustomRole({
        elasticsearch: {
          cluster: ['manage_ingest_pipelines'],
          indices: [
            {
              names: [TEST_ALERTS_INDEX],
              privileges: ['write', 'read', 'view_index_metadata', 'create_index', 'delete_index'],
            },
          ],
        },
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
    });

    test.afterEach(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('should trigger workflow from alert', async ({
      pageObjects,
      page,
      apiServices,
      scoutSpace,
      config,
    }) => {
      const getCreateAlertRuleYaml = getCreateAlertRuleWorkflow(config.projectType);

      const singleWorkflowName = 'Handle single alert';
      const multipleWorkflowName = 'Handle multiple alerts';
      const createAlertRuleWorkflowName = 'Create alert rule workflow';
      const triggerAlertWorkflowName = 'Trigger alert workflow';
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

      // Create all 4 workflows via bulk API in a single request
      const { created } = await apiServices.workflows.bulkCreate(scoutSpace.id, [
        getPrintAlertsWorkflowYaml(singleWorkflowName),
        getPrintAlertsWorkflowYaml(multipleWorkflowName),
        getCreateAlertRuleYaml(createAlertRuleWorkflowName),
        getTriggerAlertWorkflowYaml(triggerAlertWorkflowName),
      ]);
      const [singleWorkflow, multipleWorkflow, createAlertRuleWorkflow, triggerAlertWorkflow] =
        created;

      // Navigate to alert rule creation workflow and execute
      await pageObjects.workflowEditor.gotoWorkflow(createAlertRuleWorkflow.id);
      await pageObjects.workflowEditor.executeWorkflowWithInputs({
        wf_single_alert: singleWorkflow.id,
        wf_multiple_alerts: multipleWorkflow.id,
      });

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      // Navigate to alert trigger workflow and execute (indexes docs that fire the rule)
      await pageObjects.workflowEditor.gotoWorkflow(triggerAlertWorkflow.id);
      await pageObjects.workflowEditor.executeWorkflowWithInputs({ alerts: mockAlerts });

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      // Validate single-alert workflow executions (one alert per execution)
      await pageObjects.workflowEditor.gotoWorkflowExecutions(singleWorkflow.id);

      const singleWorkflowExecutions = page.testSubj.locator('workflowExecutionListItem');
      await expect(singleWorkflowExecutions).toHaveCount(mockAlerts.length, {
        timeout: ALERT_PROPAGATION_TIMEOUT,
      });

      // Security detection alerts embed the original document, so we can assert on alert_id.
      // Generic alerting alerts (obs/ESS) contain Kibana alert metadata without original doc fields,
      // so we only verify execution structure (counts, iterations) for those.
      const isSecurityProject = config.projectType === 'security';

      // Most recent execution first -> last alert first
      const expectedSingleAlertIds = mockAlerts.map((a) => a.alert_id).reverse();

      for (let i = 0; i < expectedSingleAlertIds.length; i++) {
        // eslint-disable-next-line playwright/no-nth-methods -- iterating over execution list items by index
        await singleWorkflowExecutions.nth(i).click();

        await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
        await pageObjects.workflowExecution.expandStepsTree();

        // Only 1 iteration per execution (single-alert mode)
        const logEachAlertButton = await pageObjects.workflowExecution.getStep(
          'foreach_log_each_alert > 0 > log_each_alert'
        );
        await logEachAlertButton.click();

        const stepOutput = await pageObjects.workflowExecution.getStepResultJson<unknown>('output');
        const stepOutputStr = JSON.stringify(stepOutput);
        // Security detection alerts embed the original document, so we can assert on alert_id.
        // Generic alerting alerts (obs/ESS) contain Kibana alert metadata without original doc
        // fields — we verify the output is non-empty (the step ran) and contains alert info.
        // eslint-disable-next-line playwright/no-conditional-in-test
        const expectedContent = isSecurityProject ? expectedSingleAlertIds[i] : 'alert';
        expect(stepOutputStr).toContain(expectedContent);

        await page.testSubj.click('workflowBackToExecutionsLink');
        await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });
      }

      // Validate multiple-alerts workflow execution (all alerts in one execution)
      await pageObjects.workflowEditor.gotoWorkflowExecutions(multipleWorkflow.id);

      const multipleWorkflowExecutions = page.testSubj.locator('workflowExecutionListItem');
      await expect(multipleWorkflowExecutions).toHaveCount(1, {
        timeout: ALERT_PROPAGATION_TIMEOUT,
      });

      await multipleWorkflowExecutions.click();

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
      await pageObjects.workflowExecution.expandStepsTree();

      // 2 iterations (both alerts in single execution)
      for (let i = 0; i < mockAlerts.length; i++) {
        const logEachAlertButton = await pageObjects.workflowExecution.getStep(
          `foreach_log_each_alert > ${i} > log_each_alert`
        );
        await logEachAlertButton.click();

        const alertOutput = await pageObjects.workflowExecution.getStepResultJson<unknown>(
          'output'
        );
        // Security alerts contain the original document with alert_id;
        // generic alerting alerts contain Kibana alert metadata.
        // eslint-disable-next-line playwright/no-conditional-in-test
        const expectedAlertContent = isSecurityProject ? mockAlerts[i].alert_id : 'alert';
        expect(JSON.stringify(alertOutput)).toContain(expectedAlertContent);
      }
    });

    test('should not trigger a disabled workflow when alert fires', async ({
      pageObjects,
      page,
      apiServices,
      scoutSpace,
      config,
    }) => {
      const getCreateAlertRuleYaml = getCreateAlertRuleWorkflow(config.projectType);

      const disabledWorkflowName = 'Disabled alert target';
      const canaryWorkflowName = 'Canary alert target';
      const createRuleWorkflowName = 'Create rule for disabled test';
      const triggerAlertWorkflowName = 'Trigger alert for disabled test';

      const mockAlerts = [
        {
          severity: 'medium',
          alert_id: 'disabled_workflow_test_alert',
          description: 'Alert that should NOT trigger a disabled workflow.',
          category: 'test',
          timestamp: '2023-12-01T00:00:00Z',
        },
      ];

      // Create four workflows: the target to be disabled, a canary that stays enabled
      // (to prove alerts actually propagated), plus rule-creation and alert-trigger helpers.
      const { created } = await apiServices.workflows.bulkCreate(scoutSpace.id, [
        getPrintAlertsWorkflowYaml(disabledWorkflowName),
        getPrintAlertsWorkflowYaml(canaryWorkflowName),
        getCreateAlertRuleYaml(createRuleWorkflowName),
        getTriggerAlertWorkflowYaml(triggerAlertWorkflowName),
      ]);
      const [disabledWorkflow, canaryWorkflow, createRuleWorkflow, triggerAlertWorkflow] = created;

      // Set up the alert rule with two actions:
      // - wf_single_alert -> the workflow we will disable
      // - wf_multiple_alerts -> the canary that stays enabled (proves alerts fired)
      await pageObjects.workflowEditor.gotoWorkflow(createRuleWorkflow.id);
      await pageObjects.workflowEditor.executeWorkflowWithInputs({
        wf_single_alert: disabledWorkflow.id,
        wf_multiple_alerts: canaryWorkflow.id,
      });
      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      // Disable the target workflow from the workflows list UI
      await pageObjects.workflowList.navigate();
      await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

      const toggleSwitch = pageObjects.workflowList.getWorkflowStateToggle(disabledWorkflowName);
      await expect(toggleSwitch).toBeChecked();
      await toggleSwitch.click();
      await expect(toggleSwitch).not.toBeChecked();

      // Trigger alerts — the rule will fire both actions, but only the canary should execute
      await pageObjects.workflowEditor.gotoWorkflow(triggerAlertWorkflow.id);
      await pageObjects.workflowEditor.executeWorkflowWithInputs({ alerts: mockAlerts });
      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      // Wait for the canary workflow to receive executions — this proves alerts propagated
      await pageObjects.workflowEditor.gotoWorkflowExecutions(canaryWorkflow.id);

      const canaryExecutions = page.testSubj.locator('workflowExecutionListItem');
      await expect(canaryExecutions).toHaveCount(1, { timeout: ALERT_PROPAGATION_TIMEOUT });

      // Now verify the disabled workflow has zero executions.
      // The canary already received its execution, so any alert-triggered execution
      // for the disabled workflow would have appeared by now.
      await pageObjects.workflowList.navigate();
      await pageObjects.workflowList
        .getWorkflowAction(disabledWorkflowName, 'editWorkflowAction')
        .click();
      await page.getByRole('button', { name: 'Executions' }).click();
      await page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });

      const disabledExecutions = page.testSubj.locator('workflowExecutionListItem');
      await expect(disabledExecutions).toHaveCount(0);
    });
  }
);
