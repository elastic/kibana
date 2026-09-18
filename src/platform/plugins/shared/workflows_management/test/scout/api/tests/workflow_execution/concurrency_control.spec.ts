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
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

const getConcurrencyWorkflowYaml = (strategy: string) => `
name: Scout API Test Workflow
enabled: true
description: Temporary workflow created by Scout API tests
triggers:
  - type: manual
    inputs:
      type: object
      properties:
        env:
          type: string
        problem:
          type: string
settings:
  concurrency:
    key: "{{inputs.env}}-{{inputs.problem}}"
    strategy: "${strategy}"


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
spaceTest.describe(
  'Workflow execution concurrency control',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.workflowsApi.deleteAll();
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
        const response = await workflowsApi.run(workflowId, event);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        scheduledExecutions.push({
          workflowExecutionId: response.workflowExecutionId,
          concurrencyKey: `${event.env}-${event.problem}`,
        });
      }

      const terminalExecutions = await Promise.all(
        scheduledExecutions.map((scheduledExecution) =>
          workflowsApi
            .waitForTermination({
              workflowExecutionId: scheduledExecution.workflowExecutionId,
            })
            .then((execution) => ({
              execution,
              concurrencyKey: scheduledExecution.concurrencyKey,
            }))
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

    spaceTest(
      'cancel-in-progress strategy cancels previous executions and completes the latest',
      async ({ apiServices }) => {
        const createdWorkflow = await apiServices.workflowsApi.create(
          getConcurrencyWorkflowYaml('cancel-in-progress')
        );

        const groupedExecutionsByConcurrencyKey = await runConcurrencyWorkflow(
          apiServices.workflowsApi,
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

    spaceTest(
      'drop strategy drops new executions until there is an already running execution',
      async ({ apiServices }) => {
        const createdWorkflow = await apiServices.workflowsApi.create(
          getConcurrencyWorkflowYaml('drop')
        );

        const groupedExecutionsByConcurrencyKey = await runConcurrencyWorkflow(
          apiServices.workflowsApi,
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
  }
);
