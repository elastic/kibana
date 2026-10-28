/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const QUEUE_SIZE = 2;
const SIMULTANEOUS_QUEUE_RUNS = 5;
const SIMULTANEOUS_DROP_RUNS = 5;
const SIMULTANEOUS_CANCEL_RUNS = 3;
const ADMISSION_SETTLE_TIMEOUT_MS = 25_000;
const CANCEL_TERMINATION_TIMEOUT_MS = 30_000;

/**
 * Statuses that mean admission has finished for these repros. `pending` and `running`
 * are transient: the winner of a queue run moves on to `waiting_for_input`, and
 * cancel-in-progress losers are cancelled before they run.
 */
const SETTLED_ADMISSION_STATUSES = new Set<string>([
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.QUEUED,
  ExecutionStatus.SKIPPED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.COMPLETED,
  ExecutionStatus.FAILED,
  ExecutionStatus.TIMED_OUT,
]);

const countByStatus = (executions: WorkflowExecutionDto[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const execution of executions) {
    const status = execution.status ?? 'unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
};

const holdSlotWorkflowYaml = (isolationKey: string) => `
name: Scout concurrency admission race
enabled: true
description: Simultaneous runs share one concurrency group
triggers:
  - type: manual
settings:
  concurrency:
    key: "queue-race-${isolationKey}"
    strategy: queue
    max: 1
    queue-size: ${QUEUE_SIZE}
steps:
  - name: hold
    type: waitForInput
    with:
      message: hold the slot
`;

const cancelInProgressWorkflowYaml = (isolationKey: string) => `
name: Scout concurrency admission race
enabled: true
description: Simultaneous runs share one concurrency group
triggers:
  - type: manual
settings:
  concurrency:
    key: "cip-race-${isolationKey}"
    strategy: cancel-in-progress
    max: 1
steps:
  - name: hold
    type: wait
    with:
      # Stay under the 5s engine threshold so the winner sleeps in-process.
      duration: 2s
  - name: log
    type: console
    with:
      message: done
`;

const dropWorkflowYaml = (isolationKey: string) => `
name: Scout concurrency admission race
enabled: true
description: Simultaneous runs share one concurrency group
triggers:
  - type: manual
settings:
  concurrency:
    key: "drop-race-${isolationKey}"
    strategy: drop
    max: 1
steps:
  - name: hold
    type: waitForInput
    with:
      message: hold the slot
`;

const startTogether = async (
  workflowsApi: WorkflowsApiService,
  workflowId: string,
  count: number
): Promise<string[]> => {
  const runs = await Promise.all(
    Array.from({ length: count }, () => workflowsApi.run(workflowId, {}))
  );
  return runs.map((run) => run.workflowExecutionId);
};

const waitForAdmissionToSettle = async (
  workflowsApi: WorkflowsApiService,
  workflowId: string,
  expectedCount: number
): Promise<WorkflowExecutionDto[]> => {
  const page = await waitForConditionOrThrow({
    action: () => workflowsApi.getExecutions(workflowId, { size: 100 }),
    condition: (next) =>
      next.results.length === expectedCount &&
      next.results.every((execution) => SETTLED_ADMISSION_STATUSES.has(execution.status ?? '')),
    interval: 500,
    timeout: ADMISSION_SETTLE_TIMEOUT_MS,
    errorMessage: (next) =>
      `Admission did not settle for ${expectedCount} runs. Last counts: ${JSON.stringify(
        countByStatus(next.results)
      )}`,
  });
  return page.results;
};

spaceTest.describe(
  'Workflow execution concurrency admission race',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.workflowsApi.deleteAll();
    });

    spaceTest(
      'queue admits one run, keeps queue-size queued, and skips the rest when runs start together',
      async ({ apiServices }) => {
        const isolationKey = randomUUID();
        const workflow = await apiServices.workflowsApi.create(holdSlotWorkflowYaml(isolationKey));

        await startTogether(apiServices.workflowsApi, workflow.id, SIMULTANEOUS_QUEUE_RUNS);

        const executions = await waitForAdmissionToSettle(
          apiServices.workflowsApi,
          workflow.id,
          SIMULTANEOUS_QUEUE_RUNS
        );

        expect(countByStatus(executions)).toStrictEqual({
          [ExecutionStatus.WAITING_FOR_INPUT]: 1,
          [ExecutionStatus.QUEUED]: QUEUE_SIZE,
          [ExecutionStatus.SKIPPED]: SIMULTANEOUS_QUEUE_RUNS - 1 - QUEUE_SIZE,
        });
      }
    );

    spaceTest(
      'drop admits one run and skips the rest when runs start together',
      async ({ apiServices }) => {
        const isolationKey = randomUUID();
        const workflow = await apiServices.workflowsApi.create(dropWorkflowYaml(isolationKey));

        await startTogether(apiServices.workflowsApi, workflow.id, SIMULTANEOUS_DROP_RUNS);

        const executions = await waitForAdmissionToSettle(
          apiServices.workflowsApi,
          workflow.id,
          SIMULTANEOUS_DROP_RUNS
        );

        expect(countByStatus(executions)).toStrictEqual({
          [ExecutionStatus.WAITING_FOR_INPUT]: 1,
          [ExecutionStatus.SKIPPED]: SIMULTANEOUS_DROP_RUNS - 1,
        });
      }
    );

    spaceTest(
      'cancel-in-progress completes only the newest run when several start together',
      async ({ apiServices }) => {
        const isolationKey = randomUUID();
        const workflow = await apiServices.workflowsApi.create(
          cancelInProgressWorkflowYaml(isolationKey)
        );

        const executionIds = await startTogether(
          apiServices.workflowsApi,
          workflow.id,
          SIMULTANEOUS_CANCEL_RUNS
        );

        const executions = await Promise.all(
          executionIds.map((workflowExecutionId) =>
            apiServices.workflowsApi.waitForTermination({
              workflowExecutionId,
              timeout: CANCEL_TERMINATION_TIMEOUT_MS,
            })
          )
        );

        expect(countByStatus(executions.filter((execution) => execution != null))).toStrictEqual({
          [ExecutionStatus.CANCELLED]: SIMULTANEOUS_CANCEL_RUNS - 1,
          [ExecutionStatus.COMPLETED]: 1,
        });
      }
    );
  }
);
