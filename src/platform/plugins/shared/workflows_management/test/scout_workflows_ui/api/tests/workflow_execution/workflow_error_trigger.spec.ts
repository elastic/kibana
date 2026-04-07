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
import { isTerminalStatus } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const FAILING_WORKFLOW_YAML = `
name: Scout Error Trigger - Failing Workflow
enabled: true
description: Fails on purpose to trigger workflows.failed
triggers:
  - type: manual
steps:
  - name: fail_step
    type: http
    with:
      url: "https://httpstat.us/500"
      method: GET
`;

const ERROR_HANDLER_WORKFLOW_YAML = `
name: Scout Error Trigger - Error Handler
enabled: true
description: Subscribes to workflows.failed
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true'
steps:
  - name: log_event
    type: console
    with:
      message: "Error handler ran for workflow {{ event.workflow.name }}"
`;

/** Failing workflow whose name does not match "Scout*" (for filter-by-name no-match test). */
const FAILING_OTHER_NAME_WORKFLOW_YAML = `
name: Other Failing Workflow
enabled: true
description: Fails on purpose; name does not match Scout*
triggers:
  - type: manual
steps:
  - name: fail_step
    type: http
    with:
      url: "https://httpstat.us/500"
      method: GET
`;

/** Error handler that runs only when event.workflow.name matches Scout* (wildcard). */
const ERROR_HANDLER_NAME_FILTER_YAML = `
name: Scout Error Trigger - Name Filter Handler
enabled: true
description: Subscribes to workflows.failed when workflow name matches Scout*
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true and event.workflow.name: Scout*'
steps:
  - name: log_event
    type: console
    with:
      message: "Name filter handler ran for {{ event.workflow.name }}"
`;

/** Error handler that runs only when event.error.stepId is "fail_step". */
const ERROR_HANDLER_STEP_ID_FILTER_YAML = `
name: Scout Error Trigger - StepId Filter Handler
enabled: true
description: Subscribes to workflows.failed when failed step id is fail_step
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true and event.error.stepId:"fail_step"'
steps:
  - name: log_event
    type: console
    with:
      message: "StepId filter handler ran for step {{ event.error.stepId }}"
`;

async function waitForExecution(
  workflowsApi: WorkflowsApiService,
  executionId: string,
  timeoutMs = 30_000
) {
  return waitForConditionOrThrow({
    action: () => workflowsApi.getExecution(executionId),
    condition: (exec) => !!exec && isTerminalStatus(exec.status ?? ''),
    interval: 1000,
    timeout: timeoutMs,
    errorMessage: (exec) =>
      `Execution ${executionId} did not terminate within ${timeoutMs}ms (last status: ${exec?.status})`,
  });
}

// Failing: See https://github.com/elastic/kibana/issues/261498
spaceTest.describe.skip(
  'Workflow error trigger (workflows.failed)',
  { tag: tags.deploymentAgnostic },
  () => {
    let workflowsApi: WorkflowsApiService;
    let failingWorkflowId: string;
    let errorHandlerWorkflowId: string;
    let failingOtherWorkflowId: string;
    let handlerNameFilterId: string;
    let handlerStepFilterId: string;

    spaceTest.beforeAll(async ({ apiServices }) => {
      spaceTest.setTimeout(90_000);
      workflowsApi = apiServices.workflowsApi;

      const failing = await workflowsApi.create(FAILING_WORKFLOW_YAML);
      failingWorkflowId = failing.id;

      const failingOther = await workflowsApi.create(FAILING_OTHER_NAME_WORKFLOW_YAML);
      failingOtherWorkflowId = failingOther.id;

      const handler = await workflowsApi.create(ERROR_HANDLER_WORKFLOW_YAML);
      errorHandlerWorkflowId = handler.id;

      const handlerNameFilter = await workflowsApi.create(ERROR_HANDLER_NAME_FILTER_YAML);
      handlerNameFilterId = handlerNameFilter.id;

      const handlerStepFilter = await workflowsApi.create(ERROR_HANDLER_STEP_ID_FILTER_YAML);
      handlerStepFilterId = handlerStepFilter.id;
    });

    spaceTest.afterAll(async () => {
      await workflowsApi.deleteAll();
    });

    spaceTest(
      'when a workflow fails, a workflow subscribed to workflows.failed runs and receives the event',
      async () => {
        const { workflowExecutionId: failedExecutionId } = await workflowsApi.run(
          failingWorkflowId,
          {}
        );

        const failedExecution = await waitForExecution(workflowsApi, failedExecutionId);
        expect(failedExecution?.status).toBe(ExecutionStatus.FAILED);

        const { results: handlerExecutions } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(errorHandlerWorkflowId),
          condition: ({ results: r }) => r.length >= 1,
          interval: 2000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `Error-handler workflow should have at least one execution, got ${r.length}`,
        });

        expect(handlerExecutions.length).toBeGreaterThan(0);

        const firstHandlerExecution = handlerExecutions[0];
        expect(firstHandlerExecution).toBeDefined();
        const handlerExecutionId = (firstHandlerExecution as typeof handlerExecutions[number]).id;
        const handlerExecution = await waitForExecution(workflowsApi, handlerExecutionId);

        expect(handlerExecution?.triggeredBy).toBe('workflows.failed');
        expect(handlerExecution?.status).toBe(ExecutionStatus.COMPLETED);
      }
    );

    spaceTest('filter by workflow name: handler runs when name matches condition', async () => {
      const { results: initialResults } = await workflowsApi.getExecutions(handlerNameFilterId);
      const initialCount = initialResults.length;

      await workflowsApi.run(failingWorkflowId, {});
      const { results: afterMatch } = await waitForConditionOrThrow({
        action: () => workflowsApi.getExecutions(handlerNameFilterId),
        condition: ({ results: r }) => r.length >= initialCount + 1,
        interval: 2000,
        timeout: 25_000,
        errorMessage: ({ results: r }) =>
          `Name filter handler should have at least ${
            initialCount + 1
          } execution(s) after Scout workflow failed, got ${r.length}`,
      });
      expect(afterMatch.length).toBeGreaterThan(initialCount);
    });

    spaceTest(
      'filter by workflow name: handler does not run when name does not match',
      async () => {
        const { results: beforeResults } = await workflowsApi.getExecutions(handlerNameFilterId);
        const countBefore = beforeResults.length;

        const { workflowExecutionId: otherExecutionId } = await workflowsApi.run(
          failingOtherWorkflowId,
          {}
        );
        await waitForExecution(workflowsApi, otherExecutionId);
        const quietAfterMs = Date.now() + 5000;

        const { results: finalResults } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(handlerNameFilterId),
          condition: ({ results: r }) => {
            if (r.length !== countBefore) {
              throw new Error(
                `Name filter handler should stay at ${countBefore} execution(s) after non-Scout workflow failed, got ${r.length}`
              );
            }
            return Date.now() >= quietAfterMs;
          },
          interval: 1000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `Name filter handler count should remain ${countBefore} after quiet window, last count: ${r.length}`,
        });
        expect(finalResults).toHaveLength(countBefore);
      }
    );

    spaceTest(
      'filter by failed step: handler runs when event.error.stepId matches condition',
      async () => {
        const { workflowExecutionId: failedExecutionId } = await workflowsApi.run(
          failingWorkflowId,
          {}
        );
        const failedExecution = await waitForExecution(workflowsApi, failedExecutionId);
        expect(failedExecution?.status).toBe(ExecutionStatus.FAILED);

        const { results: handlerExecutions } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(handlerStepFilterId),
          condition: ({ results: r }) => r.length >= 1,
          interval: 2000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `StepId filter handler should run when workflow fails at fail_step, got ${r.length} executions`,
        });

        const firstHandlerExecution = handlerExecutions[0];
        expect(firstHandlerExecution).toBeDefined();
        const handlerExecutionId = (firstHandlerExecution as typeof handlerExecutions[number]).id;
        const handlerExecution = await waitForExecution(workflowsApi, handlerExecutionId);
        expect(handlerExecution?.triggeredBy).toBe('workflows.failed');
        expect(handlerExecution?.status).toBe(ExecutionStatus.COMPLETED);
      }
    );
  }
);
