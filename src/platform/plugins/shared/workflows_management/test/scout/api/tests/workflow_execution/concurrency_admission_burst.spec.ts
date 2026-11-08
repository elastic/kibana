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

const BURST_SIZE = 50;
/** Covers serialized admission of the whole burst plus the winner reaching its hold step. */
const BURST_TEST_TIMEOUT_MS = 180_000;
const ADMISSION_SETTLE_TIMEOUT_MS = 30_000;

/**
 * Statuses that mean this burst has finished deciding. The winner stays on
 * `waiting_for_input` so the slot is still taken when the last request arrives.
 */
const SETTLED_ADMISSION_STATUSES = new Set<string>([
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.SKIPPED,
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.COMPLETED,
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

const dropBurstWorkflowYaml = (isolationKey: string) => `
name: Scout concurrency admission burst
enabled: true
description: A burst of runs shares one drop group
triggers:
  - type: manual
settings:
  concurrency:
    key: "drop-burst-${isolationKey}"
    strategy: drop
    max: 1
steps:
  - name: hold
    type: waitForInput
    with:
      message: hold the slot for the burst
`;

const rejectionMessage = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

spaceTest.describe(
  'Workflow execution concurrency admission burst',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.workflowsApi.deleteAll();
    });

    spaceTest(
      'drop admits one run and skips the rest when fifty runs start together',
      async ({ apiServices }, testInfo) => {
        spaceTest.setTimeout(BURST_TEST_TIMEOUT_MS);
        const workflowsApi: WorkflowsApiService = apiServices.workflowsApi;
        const workflow = await workflowsApi.create(dropBurstWorkflowYaml(randomUUID()));

        const startedAt = Date.now();
        const results = await Promise.allSettled(
          Array.from({ length: BURST_SIZE }, () => workflowsApi.run(workflow.id, {}))
        );
        const elapsedMs = Date.now() - startedAt;
        const failures = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map((result) => rejectionMessage(result.reason));

        testInfo.annotations.push({
          type: 'burst',
          description: `${BURST_SIZE} runs returned in ${elapsedMs}ms, ${failures.length} request failures`,
        });

        expect(
          failures,
          `A burst of ${BURST_SIZE} returned ${failures.length} request failures in ${elapsedMs}ms`
        ).toStrictEqual([]);

        const page = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(workflow.id, { size: 100 }),
          condition: (next) =>
            next.results.length === BURST_SIZE &&
            next.results.every((execution) =>
              SETTLED_ADMISSION_STATUSES.has(execution.status ?? '')
            ),
          interval: 500,
          timeout: ADMISSION_SETTLE_TIMEOUT_MS,
          errorMessage: (next) =>
            `Admission did not settle for ${BURST_SIZE} runs after ${elapsedMs}ms. Last counts: ${JSON.stringify(
              countByStatus(next.results)
            )}`,
        });

        expect(
          countByStatus(page.results),
          `Burst of ${BURST_SIZE} settled in ${elapsedMs}ms`
        ).toStrictEqual({
          [ExecutionStatus.WAITING_FOR_INPUT]: 1,
          [ExecutionStatus.SKIPPED]: BURST_SIZE - 1,
        });
      }
    );
  }
);
