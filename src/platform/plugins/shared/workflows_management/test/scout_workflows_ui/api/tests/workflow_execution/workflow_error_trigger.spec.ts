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
description: Fails on purpose to trigger workflows.executionFailed
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
description: Subscribes to workflows.executionFailed
triggers:
  - type: workflows.executionFailed
    on:
      condition: not event.workflow.isErrorHandler:true
steps:
  - name: log_event
    type: console
    with:
      message: "Error handler ran for workflow {{ event.workflow.name }}"
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

spaceTest.describe(
  'Workflow error trigger (workflows.executionFailed)',
  { tag: tags.deploymentAgnostic },
  () => {
    let workflowsApi: WorkflowsApiService;
    let failingWorkflowId: string;
    let errorHandlerWorkflowId: string;

    spaceTest.beforeAll(async ({ apiServices }) => {
      spaceTest.setTimeout(90_000);
      workflowsApi = apiServices.workflowsApi;

      const failing = await workflowsApi.create(FAILING_WORKFLOW_YAML);
      failingWorkflowId = failing.id;

      const handler = await workflowsApi.create(ERROR_HANDLER_WORKFLOW_YAML);
      errorHandlerWorkflowId = handler.id;
    });

    spaceTest.afterAll(async () => {
      await workflowsApi.deleteAll();
    });

    spaceTest(
      'when a workflow fails, a workflow subscribed to workflows.executionFailed runs and receives the event',
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
        const handlerExecutionId = (firstHandlerExecution as (typeof handlerExecutions)[number]).id;
        const handlerExecution = await waitForExecution(workflowsApi, handlerExecutionId);

        expect(handlerExecution?.triggeredBy).toBe('workflows.executionFailed');
        expect(handlerExecution?.status).toBe(ExecutionStatus.COMPLETED);
      }
    );
  }
);
