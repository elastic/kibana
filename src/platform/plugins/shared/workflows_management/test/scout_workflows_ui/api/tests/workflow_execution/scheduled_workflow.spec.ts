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

const SCHEDULED_WORKFLOW_INTERVAL_SECONDS = 5;

// Task Manager executes scheduled tasks via a fixed-interval polling loop (default: 3 s).
// A task can only start when a poll cycle fires AND the task's `runAt` has passed —
// there is no "wake up at exactly runAt" mechanism.
//
// When the workflow interval is not a multiple of the poll interval, the Least Common
// Multiple (LCM) determines the repeating execution pattern over time:
//
//   LCM(interval=5s, pollInterval=3s) = 15s
//   → 3 executions per 15-second window, spaced ~6s / ~6s / ~3s  (never exactly 5s)
//
// The bounds any consecutive-run gap must satisfy:
//   min = TASK_MANAGER_POLL_INTERVAL_MS          (poll cannot fire more often than this)
//   max = interval + TASK_MANAGER_POLL_INTERVAL_MS  (at most one poll miss per cycle)
const TASK_MANAGER_POLL_INTERVAL_MS = 3_000;

const SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML = `
name: Scout Scheduled Workflow Test
enabled: false
description: Scheduled workflow that runs every ${SCHEDULED_WORKFLOW_INTERVAL_SECONDS}s for testing
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
description: Scheduled workflow that runs every ${SCHEDULED_WORKFLOW_INTERVAL_SECONDS}s for testing
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
      duration: ${SCHEDULED_WORKFLOW_INTERVAL_SECONDS + 1}s
`;

spaceTest.describe('Scheduled workflow execution', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let workflowId: string;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;
    const created = await workflowsApi.create(SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML);
    workflowId = created.id;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('enabling a scheduled workflow triggers executions automatically', async () => {
    await workflowsApi.update(workflowId, { enabled: true });
    const expectedExecutions = 3;

    // LCM(5s, 3s) = 15s per 3-execution cycle. Add a generous buffer for startup
    // jitter (adaptive polling, stale-execution cleanup) that can delay the first run.
    const { results } = await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) => r.length >= expectedExecutions,
      interval: 1000,
      timeout: 25_000,
      errorMessage: ({ results: r }) =>
        `Expected >= ${expectedExecutions} executions, got ${r.length}`,
    });

    const completedExecutions = await Promise.all(
      results.map((e) => workflowsApi.waitForTermination({ workflowExecutionId: e.id }))
    );
    // Filter out any executions that lack a startedAt timestamp before sorting.
    // Executions without startedAt produce NaN when used in Date arithmetic.
    const completedExecutionsSorted = completedExecutions
      .filter((e): e is NonNullable<typeof e> & { startedAt: string } => e?.startedAt != null)
      .toSorted((a, b) => a.startedAt.localeCompare(b.startedAt));

    // Task Manager's poll-based scheduler produces uneven gaps when interval is not a
    // multiple of pollInterval. For interval=5s and pollInterval=3s the repeating
    // pattern is ~6s / ~6s / ~3s rather than ~5s / ~5s / ~5s.
    //
    // We assert only an upper bound on the gap between consecutive executions:
    //   ≤ interval + TASK_MANAGER_POLL_INTERVAL_MS  — at most one poll miss per interval
    //
    // No lower bound is asserted on `startedAt` gaps. `startedAt` is set by the
    // workflow engine after Task Manager claims the task, so cold-start overhead on
    // the first run (ES document creation, warm-up) shifts its timestamp later than
    // the actual claim time, making the first→second gap appear shorter than the
    // scheduling interval — even though the Task Manager timing was correct.
    const maxGapMs = SCHEDULED_WORKFLOW_INTERVAL_SECONDS * 1000 + TASK_MANAGER_POLL_INTERVAL_MS;
    for (let index = 1; index < completedExecutionsSorted.length; index++) {
      const currentExecution = completedExecutionsSorted[index];
      const currentStart = new Date(currentExecution.startedAt).getTime();
      const previousStart = new Date(completedExecutionsSorted[index - 1].startedAt).getTime();
      const gap = currentStart - previousStart;
      expect(
        gap,
        `gap between run ${index} and run ${index + 1} should be ≤ interval + pollInterval`
      ).toBeLessThan(maxGapMs + 1);
      expect(currentExecution.status).toBe(ExecutionStatus.COMPLETED);
    }
  });

  spaceTest('disabling a scheduled workflow stops new executions from firing', async () => {
    await workflowsApi.update(workflowId, { enabled: true });

    await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) => r.length >= 1,
      interval: 1000,
      timeout: SCHEDULED_WORKFLOW_INTERVAL_SECONDS * 1000 * 2,
      errorMessage: 'No executions appeared after enabling the workflow',
    });

    await workflowsApi.update(workflowId, { enabled: false });

    const { results: beforeDisable } = await workflowsApi.getExecutions(workflowId);
    const countBeforeDisable = beforeDisable.length;

    // 10 s > max single gap (~6 s for interval=5s / pollInterval=3s), so any
    // execution already in-flight will have completed and no new ones should start.
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
      // Workflow is scheduled every 5s with an 11s wait step (execution > interval).
      // The scheduler must wait for the active run to finish before starting the next.
      // We verify this by checking that no two consecutive runs overlap in time using
      // the finishedAt / startedAt fields from WorkflowExecutionDto.
      const createdLongRunningWorkflow = await workflowsApi.create(
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
      await workflowsApi.update(createdLongRunningWorkflow.id, { enabled: false });
      const { results } = await workflowsApi.getExecutions(createdLongRunningWorkflow.id);

      // Wait for every execution to reach a terminal state
      const terminalExecutions = await Promise.all(
        results.map((e) => workflowsApi.waitForTermination({ workflowExecutionId: e.id }))
      );

      // Keep only completed executions with both timestamps, sorted by startedAt
      const completedExecutions = terminalExecutions
        .filter(
          (e): e is NonNullable<typeof e> & { startedAt: string; finishedAt: string } =>
            e?.status === ExecutionStatus.COMPLETED && e.startedAt != null && e.finishedAt != null
        )
        .toSorted((a, b) => a.startedAt.localeCompare(b.startedAt));

      expect(completedExecutions.length).toBeGreaterThan(1);

      // Non-overlap invariant: each run must finish before the next one starts.
      // This is a direct structural check that does not depend on the wait step
      // duration or on the Task Manager poll interval.
      for (let index = 1; index < completedExecutions.length; index++) {
        const previousFinished = new Date(completedExecutions[index - 1].finishedAt).getTime();
        const currentStarted = new Date(completedExecutions[index].startedAt).getTime();
        expect(
          currentStarted,
          `run ${index + 1} started before run ${index} finished (overlap detected)`
        ).toBeGreaterThan(previousFinished);
      }
    }
  );
});
