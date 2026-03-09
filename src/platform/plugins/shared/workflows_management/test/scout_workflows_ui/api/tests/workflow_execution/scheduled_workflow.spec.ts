/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const SCHEDULED_WORKFLOW_INTERVAL_SECONDS = 10;

const SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML = `
name: Scout Scheduled Workflow Test
enabled: false
description: Scheduled workflow that runs every 10s for testing
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
description: Scheduled workflow that runs every 10s for testing
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
      duration: 11s
`;

// FLAKY: https://github.com/elastic/security-team/issues/16272
spaceTest.describe.skip('Scheduled workflow execution', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let spaceId: string;
  let workflowId: string;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    spaceTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;
    spaceId = scoutSpace.id;

    const created = await workflowsApi.create(spaceId, SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML);
    workflowId = created.id;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll(spaceId);
  });

  spaceTest('enabling a scheduled workflow triggers executions automatically', async () => {
    await workflowsApi.update(spaceId, workflowId, { enabled: true });

    const { results } = await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) => r.length > 2,
      interval: 1000,
      timeout: 30_000,
      errorMessage: ({ results: r }) => `Expected > 2 executions, got ${r.length}`,
    });

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
      expect(currentStart - previousStart).toBeGreaterThan(
        SCHEDULED_WORKFLOW_INTERVAL_SECONDS * 1000 * 0.85 // 85% of the interval to reduce the risk of flakiness
      );
      expect(currentExecution?.status).toBe(ExecutionStatus.COMPLETED);
    }
  });

  spaceTest('disabling a scheduled workflow stops new executions from firing', async () => {
    await workflowsApi.update(spaceId, workflowId, { enabled: true });

    await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) => r.length >= 1,
      interval: 1000,
      timeout: 20_000,
      errorMessage: 'No executions appeared after enabling the workflow',
    });

    await workflowsApi.update(spaceId, workflowId, { enabled: false });

    const { results: beforeDisable } = await workflowsApi.getExecutions(workflowId);
    const countBeforeDisable = beforeDisable.length;

    // Wait another interval to confirm no new executions appear
    await new Promise((resolve) => setTimeout(resolve, 10_000));

    const { results: afterDisable } = await workflowsApi.getExecutions(workflowId);

    // Allow at most 1 extra execution that was already in-flight when we disabled
    expect(afterDisable.length - countBeforeDisable, {
      message: `Expected 0 or 1 new executions after disable, got ${afterDisable.length} (before: ${countBeforeDisable})`,
    }).toBeLessThan(2);
  });

  spaceTest(
    'scheduled executions do not overlap when a previous run is still in progress',
    async () => {
      // Each execution takes ~7s (two 3s waits + console step), scheduled every 5s.
      // If the scheduler is reentrant, it must wait for the previous run to finish
      // before starting the next one, so consecutive starts should be >5s apart.
      const createdLongRunningWorkflow = await workflowsApi.create(
        spaceId,
        LONG_RUNNING_SCHEDULED_WORKFLOW_YAML
      );

      await waitForConditionOrThrow({
        action: () => workflowsApi.getExecutions(createdLongRunningWorkflow.id),
        condition: ({ results: r }) =>
          r.filter((e) => e.status === ExecutionStatus.COMPLETED).length >= 2,
        interval: 2000,
        timeout: 40_000,
        errorMessage: ({ results: r }) =>
          `Expected >= 2 completed executions, got ${
            r.filter((e) => e.status === ExecutionStatus.COMPLETED).length
          }`,
      });
      await workflowsApi.update(spaceId, createdLongRunningWorkflow.id, { enabled: false });
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
        expect(currentStart - previousStart).toBeGreaterThan(
          SCHEDULED_WORKFLOW_INTERVAL_SECONDS * 1000 * 2 // multiply by 2 because the wait step takes 6s that will be added to the interval
        );
      }
    }
  );
});
