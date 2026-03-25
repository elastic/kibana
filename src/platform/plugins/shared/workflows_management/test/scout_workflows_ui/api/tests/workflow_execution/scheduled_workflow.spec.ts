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

// Minimum allowed interval is 60s — see ScheduledTriggerSchema validation.
// Seconds values < 60 are rejected by the schema regex.
const SCHEDULED_WORKFLOW_INTERVAL = '1m';
const SCHEDULED_WORKFLOW_INTERVAL_MS = 60_000;

// Task Manager executes scheduled tasks via a fixed-interval polling loop (default: 3 s).
// A task can only start when a poll cycle fires AND the task's `runAt` has passed —
// there is no "wake up at exactly runAt" mechanism.
//
// When the workflow interval is a multiple of the poll interval, the Least Common
// Multiple (LCM) equals the interval itself and gaps are uniform:
//
// Maximum gap any consecutive-run gap can reach:
//   interval + TASK_MANAGER_POLL_INTERVAL_MS  (one poll miss at most per interval)
const TASK_MANAGER_POLL_INTERVAL_MS = 3_000;

const SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML = `
name: Scout Scheduled Workflow Test
enabled: false
description: Scheduled workflow that runs every minute for testing
triggers:
  - type: scheduled
    with:
      every: ${SCHEDULED_WORKFLOW_INTERVAL}
steps:
  - name: log_step
    type: console
    with:
      message: "Scheduled execution fired"
`;

spaceTest.describe('Scheduled workflow execution', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let workflowId: string;

  spaceTest.setTimeout(300_000);

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
    const created = await workflowsApi.create(SHORT_RUNNING_SCHEDULED_WORKFLOW_YAML);
    workflowId = created.id;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('enabling a scheduled workflow triggers executions automatically', async () => {
    await workflowsApi.update(workflowId, { enabled: true });
    const expectedExecutions = 2;

    // Two executions at 1m each: minimum ~60s, add buffer for startup jitter
    // (adaptive polling, stale-execution cleanup) that can delay the first run.
    const { results } = await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) => r.length >= expectedExecutions,
      interval: 5000,
      timeout: 180_000,
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

    // Since 60s is a multiple of pollInterval (3s), LCM(60, 3) = 60s and gaps are
    // uniform. Each gap must not exceed interval + pollInterval (one poll miss at most).
    //
    // No lower bound is asserted on `startedAt` gaps. `startedAt` is set by the
    // workflow engine after Task Manager claims the task, so cold-start overhead on
    // the first run shifts its timestamp, making the first→second gap appear shorter
    // than the scheduling interval — even though the Task Manager timing was correct.
    const maxGapMs = SCHEDULED_WORKFLOW_INTERVAL_MS + TASK_MANAGER_POLL_INTERVAL_MS;
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
      interval: 5000,
      timeout: SCHEDULED_WORKFLOW_INTERVAL_MS * 2,
      errorMessage: 'No executions appeared after enabling the workflow',
    });

    await workflowsApi.update(workflowId, { enabled: false });

    const { results: beforeDisable } = await workflowsApi.getExecutions(workflowId);
    const countBeforeDisable = beforeDisable.length;

    // Wait longer than one full interval + poll cycle so any in-flight execution
    // completes and no new ones start (interval=60s, pollInterval=3s → wait 90s).
    await new Promise((resolve) => setTimeout(resolve, 90_000));

    const { results: afterDisable } = await workflowsApi.getExecutions(workflowId);

    // Allow at most 1 extra execution that was already in-flight when we disabled
    expect(afterDisable.length - countBeforeDisable, {
      message: `Expected 0 or 1 new executions after disable, got ${afterDisable.length} (before: ${countBeforeDisable})`,
    }).toBeLessThan(2);
  });

  spaceTest('scheduled executions do not overlap', async () => {
    // Non-overlap invariant: each run must finish before the next one starts.
    // This holds for any execution regardless of duration — fast runs complete
    // well within the polling interval so they never overlap by construction,
    // but verifying it catches scheduler bugs (e.g. double-dispatching).
    //
    // We reuse the same workflow from beforeAll — it should already have 2+
    // completed executions from the preceding test. If not, wait for them.
    await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) =>
        r.filter((e) => e.status === ExecutionStatus.COMPLETED).length >= 2,
      interval: 5000,
      timeout: 180_000,
      errorMessage: ({ results: r }) =>
        `Expected >= 2 completed executions, got ${
          r.filter((e) => e.status === ExecutionStatus.COMPLETED).length
        }`,
    });

    const { results } = await workflowsApi.getExecutions(workflowId);
    const terminalExecutions = await Promise.all(
      results.map((e) => workflowsApi.waitForTermination({ workflowExecutionId: e.id }))
    );

    const completedExecutions = terminalExecutions
      .filter(
        (e): e is NonNullable<typeof e> & { startedAt: string; finishedAt: string } =>
          e?.status === ExecutionStatus.COMPLETED && e.startedAt != null && e.finishedAt != null
      )
      .toSorted((a, b) => a.startedAt.localeCompare(b.startedAt));

    expect(completedExecutions.length).toBeGreaterThan(1);

    for (let index = 1; index < completedExecutions.length; index++) {
      const previousFinished = new Date(completedExecutions[index - 1].finishedAt).getTime();
      const currentStarted = new Date(completedExecutions[index].startedAt).getTime();
      expect(
        currentStarted,
        `run ${index + 1} started before run ${index} finished (overlap detected)`
      ).toBeGreaterThan(previousFinished);
    }
  });
});
