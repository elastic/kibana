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
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const QUEUE_SIZE = 2;
const SIMULTANEOUS_QUEUE_RUNS = 5;
const SIMULTANEOUS_DROP_RUNS = 5;
const SIMULTANEOUS_CANCEL_RUNS = 3;
const CANCEL_MAX_TWO = 2;
const SIMULTANEOUS_CANCEL_MAX_TWO_RUNS = 3;
// A cancel-in-progress loser that already parked at `waiting_for_input` only reaches `cancelled`
// on the next execution wake, up to `WORKFLOW_WAKE_POLL_INTERVAL_MS` (30s) later.
const ADMISSION_SETTLE_TIMEOUT_MS = 45_000;
const CANCEL_TERMINATION_TIMEOUT_MS = 30_000;

type AdmissionExecution = WorkflowExecutionDto & { createdAt?: string };

const compareAdmissionOrder = (left: AdmissionExecution, right: AdmissionExecution): number => {
  const createdAtOrder = (left.createdAt ?? '').localeCompare(right.createdAt ?? '');
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }
  return left.id.localeCompare(right.id);
};

const waitingStep = (execution: WorkflowExecutionDto): WorkflowStepExecutionDto | undefined =>
  execution.stepExecutions.find((step) => step.status === ExecutionStatus.WAITING_FOR_INPUT);

const countByStatus = (executions: WorkflowExecutionDto[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const execution of executions) {
    const status = execution.status ?? 'unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
};

const matchesStatusCounts = (
  executions: WorkflowExecutionDto[],
  expected: Record<string, number>
): boolean => {
  const counts = countByStatus(executions);
  const expectedStatuses = Object.keys(expected);
  return (
    expectedStatuses.length === Object.keys(counts).length &&
    expectedStatuses.every((status) => counts[status] === expected[status])
  );
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

const cancelInProgressWorkflowYaml = (isolationKey: string, max = 1) => `
name: Scout concurrency admission race
enabled: true
description: Simultaneous runs share one concurrency group
triggers:
  - type: manual
settings:
  concurrency:
    key: "cip-race-${isolationKey}"
    strategy: cancel-in-progress
    max: ${max}
steps:
  - name: hold
    type: waitForInput
    with:
      message: hold the slot
      schema:
        type: object
        properties:
          ok:
            type: boolean
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
  expectedCounts: Record<string, number>
): Promise<WorkflowExecutionDto[]> => {
  const page = await waitForConditionOrThrow({
    action: () => workflowsApi.getExecutions(workflowId, { size: 100 }),
    condition: (next) => matchesStatusCounts(next.results, expectedCounts),
    interval: 500,
    timeout: ADMISSION_SETTLE_TIMEOUT_MS,
    errorMessage: (next) =>
      `Admission did not settle at ${JSON.stringify(expectedCounts)}. Last counts: ${JSON.stringify(
        countByStatus(next.results)
      )}`,
  });
  return page.results;
};

const rankByAdmissionOrder = async (
  workflowsApi: WorkflowsApiService,
  executionIds: string[]
): Promise<AdmissionExecution[]> => {
  const admitted = (
    await Promise.all(
      executionIds.map((workflowExecutionId) => workflowsApi.getExecution(workflowExecutionId))
    )
  ).filter((execution): execution is AdmissionExecution => execution != null);
  return [...admitted].sort(compareAdmissionOrder);
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

        const expectedCounts = {
          [ExecutionStatus.WAITING_FOR_INPUT]: 1,
          [ExecutionStatus.QUEUED]: QUEUE_SIZE,
          [ExecutionStatus.SKIPPED]: SIMULTANEOUS_QUEUE_RUNS - 1 - QUEUE_SIZE,
        };
        const executions = await waitForAdmissionToSettle(
          apiServices.workflowsApi,
          workflow.id,
          expectedCounts
        );

        expect(countByStatus(executions)).toStrictEqual(expectedCounts);
      }
    );

    spaceTest(
      'drop admits one run and skips the rest when runs start together',
      async ({ apiServices }) => {
        const isolationKey = randomUUID();
        const workflow = await apiServices.workflowsApi.create(dropWorkflowYaml(isolationKey));

        await startTogether(apiServices.workflowsApi, workflow.id, SIMULTANEOUS_DROP_RUNS);

        const expectedCounts = {
          [ExecutionStatus.WAITING_FOR_INPUT]: 1,
          [ExecutionStatus.SKIPPED]: SIMULTANEOUS_DROP_RUNS - 1,
        };
        const executions = await waitForAdmissionToSettle(
          apiServices.workflowsApi,
          workflow.id,
          expectedCounts
        );

        expect(countByStatus(executions)).toStrictEqual(expectedCounts);
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

        await waitForAdmissionToSettle(apiServices.workflowsApi, workflow.id, {
          [ExecutionStatus.CANCELLED]: SIMULTANEOUS_CANCEL_RUNS - 1,
          [ExecutionStatus.WAITING_FOR_INPUT]: 1,
        });
        const ranked = await rankByAdmissionOrder(apiServices.workflowsApi, executionIds);
        expect(ranked.map((execution) => execution.status)).toStrictEqual([
          ExecutionStatus.CANCELLED,
          ExecutionStatus.CANCELLED,
          ExecutionStatus.WAITING_FOR_INPUT,
        ]);
        const winner = ranked[SIMULTANEOUS_CANCEL_RUNS - 1];
        expect(typeof winner.createdAt).toBe('string');

        // Step docs refresh separately from the execution doc.
        const ready = await apiServices.workflowsApi.waitForStatus({
          workflowExecutionId: winner.id,
          status: ExecutionStatus.WAITING_FOR_INPUT,
          timeout: ADMISSION_SETTLE_TIMEOUT_MS,
          until: (execution) => (waitingStep(execution)?.id ?? '').length > 0,
        });
        const holdStepId = waitingStep(ready)?.id;
        expect(typeof holdStepId).toBe('string');
        const resumeResponse = await apiServices.workflowsApi.rawResume(
          winner.id,
          { ok: true },
          { stepExecutionId: holdStepId }
        );
        expect(resumeResponse.status).toBe(200);

        const completed = await apiServices.workflowsApi.waitForTermination({
          workflowExecutionId: winner.id,
          timeout: CANCEL_TERMINATION_TIMEOUT_MS,
        });
        expect(completed?.status).toStrictEqual(ExecutionStatus.COMPLETED);
        const finished = await Promise.all(
          executionIds.map((workflowExecutionId) =>
            apiServices.workflowsApi.getExecution(workflowExecutionId)
          )
        );
        expect(countByStatus(finished.filter((execution) => execution != null))).toStrictEqual({
          [ExecutionStatus.CANCELLED]: SIMULTANEOUS_CANCEL_RUNS - 1,
          [ExecutionStatus.COMPLETED]: 1,
        });
      }
    );

    spaceTest(
      'cancel-in-progress keeps the two newest runs when several start together',
      async ({ apiServices }) => {
        const isolationKey = randomUUID();
        const workflow = await apiServices.workflowsApi.create(
          cancelInProgressWorkflowYaml(isolationKey, CANCEL_MAX_TWO)
        );

        const executionIds = await startTogether(
          apiServices.workflowsApi,
          workflow.id,
          SIMULTANEOUS_CANCEL_MAX_TWO_RUNS
        );

        await waitForAdmissionToSettle(apiServices.workflowsApi, workflow.id, {
          [ExecutionStatus.CANCELLED]: SIMULTANEOUS_CANCEL_MAX_TWO_RUNS - CANCEL_MAX_TWO,
          [ExecutionStatus.WAITING_FOR_INPUT]: CANCEL_MAX_TWO,
        });
        const ranked = await rankByAdmissionOrder(apiServices.workflowsApi, executionIds);
        expect(ranked.map((execution) => execution.status)).toStrictEqual([
          ExecutionStatus.CANCELLED,
          ExecutionStatus.WAITING_FOR_INPUT,
          ExecutionStatus.WAITING_FOR_INPUT,
        ]);
      }
    );
  }
);
