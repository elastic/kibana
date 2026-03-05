/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { apiTest } from '../../fixtures';
import type { WorkflowsApiService } from '../../fixtures/workflows_api_service';

const SCHEDULED_WORKFLOW_INTERVAL_SECONDS = 5;

const SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML = `
name: Scout Scheduled Workflow Test
enabled: false
description: Scheduled workflow that runs every 5s for testing
triggers:
  - type: scheduled
    with:
      every: ${SCHEDULED_WORKFLOW_INTERVAL_SECONDS}s
steps:
  - name: log_step
    type: console
    with:
      message: "Scheduled execution fired"
`;

const LONG_RUNNING_SCHEDULED_WORKFLOW_YAML = `
name: Scout Scheduled Workflow Test
enabled: true
description: Scheduled workflow that runs every 5s for testing
triggers:
  - type: scheduled
    with:
      every: ${SCHEDULED_WORKFLOW_INTERVAL_SECONDS}s
steps:
  - name: log_step
    type: console
    with:
      message: "Scheduled execution fired"
  
  - name: wait
    type: wait
    with:
      duration: 6s
`;

apiTest.describe('Scheduled workflow execution', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let workflowsApi: WorkflowsApiService;
  let workflowId: string;

  apiTest.beforeAll(async ({ requestAuth, getWorkflowsApi }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    workflowsApi = await getWorkflowsApi(adminApiCredentials);

    const created = await workflowsApi.create(SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML);
    workflowId = created.id;
  });

  apiTest.afterAll(async () => {
    await workflowsApi.update(workflowId, { enabled: false });
    await workflowsApi.bulkDelete([workflowId]);
  });

  apiTest('enabling a scheduled workflow triggers executions automatically', async () => {
    apiTest.setTimeout(20_000);

    await workflowsApi.update(workflowId, { enabled: true });

    // Wait long enough for at least 2 scheduled executions (5s interval + buffer)
    await new Promise((resolve) => setTimeout(resolve, 16_000));

    const { results } = await workflowsApi.getExecutions(workflowId);

    expect(results.length).toBeGreaterThan(2);
    expect(results.length).toBeLessThan(5);

    const completedExecutions = await Promise.all(
      results.map((e) => workflowsApi.waitForTermination({ workflowExecutionId: e.id }))
    );
    const completedExecutionsSorted = completedExecutions.toSorted((a, b) =>
      (a?.startedAt ?? '').localeCompare(b?.startedAt ?? '')
    );

    for (let index = 1; index < completedExecutionsSorted.length; index++) {
      const currentExecution = completedExecutionsSorted[index];
      const currentStart = new Date(completedExecutionsSorted[index]?.startedAt ?? '').getTime();
      const previousStart = new Date(
        completedExecutionsSorted[index - 1]?.startedAt ?? ''
      ).getTime();
      expect(currentStart).toBeGreaterThan(
        previousStart + SCHEDULED_WORKFLOW_INTERVAL_SECONDS * 1000
      );
      expect(currentExecution?.status).toBe(ExecutionStatus.COMPLETED);
    }
  });

  apiTest('disabling a scheduled workflow stops new executions from firing', async () => {
    apiTest.setTimeout(20_000);

    await workflowsApi.update(workflowId, { enabled: true });

    // Wait for at least one execution
    await new Promise((resolve) => setTimeout(resolve, 8_000));

    await workflowsApi.update(workflowId, { enabled: false });

    const { results: beforeDisable } = await workflowsApi.getExecutions(workflowId);
    const countBeforeDisable = beforeDisable.length;

    // Wait another interval to confirm no new executions appear
    await new Promise((resolve) => setTimeout(resolve, 8_000));

    const { results: afterDisable } = await workflowsApi.getExecutions(workflowId);

    // Allow at most 1 extra execution that was already in-flight when we disabled
    expect(afterDisable.length - countBeforeDisable, {
      message: `Expected 0 or 1 new executions after disable, got ${afterDisable.length} (before: ${countBeforeDisable})`,
    }).toBeLessThan(2);
  });

  apiTest(
    'scheduled executions do not overlap when a previous run is still in progress',
    async () => {
      apiTest.setTimeout(30_000);

      // Each execution takes ~7s (two 3s waits + console step), scheduled every 5s.
      // If the scheduler is reentrant, it must wait for the previous run to finish
      // before starting the next one, so consecutive starts should be >5s apart.
      const createdLongRunningWorkflow = await workflowsApi.create(
        LONG_RUNNING_SCHEDULED_WORKFLOW_YAML
      );

      // Let the schedule fire multiple times while each run is still in progress
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await workflowsApi.update(createdLongRunningWorkflow.id, { enabled: false });
      const { results } = await workflowsApi.getExecutions(createdLongRunningWorkflow.id);

      // Wait for every execution to reach a terminal state
      const terminalExecutions = await Promise.all(
        results.map((e) => workflowsApi.waitForTermination({ workflowExecutionId: e.id }))
      );

      // Keep only completed executions, sorted chronologically by start time
      const completedExecutions = terminalExecutions
        .filter((e) => e?.status === ExecutionStatus.COMPLETED)
        .toSorted((a, b) => (a?.startedAt ?? '').localeCompare(b?.startedAt ?? ''));

      // At least 2 completed executions are expected, but we can have more if the scheduler was reentrant
      expect(completedExecutions.length).toBeGreaterThan(1);

      // Compare each consecutive pair: the gap between start times must exceed the 5s interval,
      // proving the scheduler waited for the prior run to finish rather than overlapping.
      for (let index = 1; index < completedExecutions.length; index++) {
        const currentStart = new Date(completedExecutions[index]?.startedAt ?? '').getTime();
        const previousStart = new Date(completedExecutions[index - 1]?.startedAt ?? '').getTime();
        expect(currentStart).toBeGreaterThan(
          previousStart + SCHEDULED_WORKFLOW_INTERVAL_SECONDS * 1000 * 2 // multiply by 2 because the wait step takes 6s that will be added to the interval
        );
      }
    }
  );
});
