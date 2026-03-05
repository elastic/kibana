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
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { apiTest } from '../../fixtures';
import type { WorkflowsApiService } from '../../fixtures/workflows_api_service';

const getConcurrencyWorkflowYaml = (strategy: string) => `
name: Scout API Test Workflow
enabled: true
description: Temporary workflow created by Scout API tests
triggers:
  - type: manual
settings:
  concurrency:
    key: "{{inputs.env}}-{{inputs.problem}}"
    strategy: "${strategy}"
inputs:
  type: object
  properties:
    env:
      type: string
    problem:
      type: string

steps:
  - name: hello_world_step_1
    type: console
    with:
      message: "Hello from Scout API test 1"
  - name: wait_step_1
    type: wait
    with:
      duration: 5s
  - name: wait_step_2
    type: wait
    with:
      duration: 5s
  - name: hello_world_step_2
    type: console
    with:
      message: "Hello from Scout API test 2"
`;
apiTest.describe('Workflow execution concurrency control', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  const createdIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ getWorkflowsApi }) => {
    const workflowsApi = await getWorkflowsApi(adminApiCredentials);
    for (const id of createdIds) {
      await workflowsApi.bulkDelete([id]);
    }
  });

  async function runConcurrencyWorkflow(workflowsApi: WorkflowsApiService, workflowId: string) {
    const events = [
      { env: 'dev', problem: 'issue-1' },
      { env: 'prod', problem: 'issue-2' },
      { env: 'dev', problem: 'issue-1' },
      { env: 'dev', problem: 'issue-3' },
      { env: 'dev', problem: 'issue-1' },
    ];

    const scheduledExecutions: { workflowExecutionId: string; concurrencyKey: string }[] = [];

    for (const event of events) {
      const response = await workflowsApi.run({
        id: workflowId,
        inputs: event,
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      scheduledExecutions.push({
        workflowExecutionId: response.workflowExecutionId,
        concurrencyKey: `${event.env}-${event.problem}`,
      });
    }

    const terminalExecutions = await Promise.all(
      scheduledExecutions.map((scheduledExecution) =>
        workflowsApi
          .waitForTermination({ workflowExecutionId: scheduledExecution.workflowExecutionId })
          .then((execution) => ({ execution, concurrencyKey: scheduledExecution.concurrencyKey }))
      )
    );

    const groupedByConcurrencyKey = terminalExecutions.reduce(
      (acc, { execution, concurrencyKey }) => {
        acc[concurrencyKey] = acc[concurrencyKey] || [];

        if (execution) {
          acc[concurrencyKey].push(execution);
        }
        return acc;
      },
      {} as Record<string, WorkflowExecutionDto[]>
    );

    return groupedByConcurrencyKey;
  }

  apiTest(
    'cancel-in-progress strategy cancels previous executions and completes the latest',
    async ({ getWorkflowsApi }) => {
      const workflowsApi = await getWorkflowsApi(adminApiCredentials);
      const createdWorkflow = await workflowsApi.create(
        getConcurrencyWorkflowYaml('cancel-in-progress')
      );

      const groupedExecutionsByConcurrencyKey = await runConcurrencyWorkflow(
        workflowsApi,
        createdWorkflow.id
      );

      Object.entries(groupedExecutionsByConcurrencyKey).forEach(([, executions]) => {
        expect(executions.length).toBeGreaterThan(0);

        // Check that all executions except the last one are cancelled
        executions
          .filter((execution) => execution.status !== ExecutionStatus.COMPLETED)
          .forEach((execution) => {
            expect(execution?.status).toBe(ExecutionStatus.CANCELLED);
          });

        // Check that the last execution is completed
        const completedExecution = executions.filter(
          (execution) => execution.status === ExecutionStatus.COMPLETED
        );
        expect(completedExecution.at(0)?.status).toBe(ExecutionStatus.COMPLETED);
        expect(completedExecution.at(0)?.stepExecutions).toHaveLength(4);
      });
    }
  );

  apiTest(
    'drop strategy drops new executions until there is an already running execution',
    async ({ getWorkflowsApi }) => {
      const workflowsApi = await getWorkflowsApi(adminApiCredentials);
      const createdWorkflow = await workflowsApi.create(getConcurrencyWorkflowYaml('drop'));

      const groupedExecutionsByConcurrencyKey = await runConcurrencyWorkflow(
        workflowsApi,
        createdWorkflow.id
      );

      Object.entries(groupedExecutionsByConcurrencyKey).forEach(([, executions]) => {
        expect(executions.length).toBeGreaterThan(0);

        executions
          .filter((execution) => execution.status !== ExecutionStatus.COMPLETED)
          .forEach((execution) => {
            expect(execution?.status).toBe(ExecutionStatus.SKIPPED);
            expect(execution?.stepExecutions).toHaveLength(0);
          });

        const completedExecution = executions.filter(
          (execution) => execution.status === ExecutionStatus.COMPLETED
        );
        expect(completedExecution).toHaveLength(1);
        expect(completedExecution.at(0)?.status).toBe(ExecutionStatus.COMPLETED);
        expect(completedExecution.at(0)?.stepExecutions).toHaveLength(4);
      });
    }
  );
});
