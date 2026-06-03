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
import { NonTerminalExecutionStatuses } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

/**
 * A workflow with a long wait step so the execution stays in a non-terminal
 * state long enough for us to observe whether it was orphaned.
 */
const LONG_RUNNING_WORKFLOW_YAML = `
name: TOCTOU Hard Delete Test Workflow
enabled: true
description: Long-running workflow for TOCTOU race condition test
triggers:
  - type: manual

steps:
  - name: long_wait
    type: wait
    with:
      duration: 30s
`;

/**
 * Header sent on the run() request to delay execution doc creation by 3s.
 * This simulates the real-world scenario where the execution engine is slow
 * to persist the execution document, widening the TOCTOU window so the
 * concurrent hard delete can slip through.
 * Only honoured for internal API requests (KbnClient sets x-elastic-internal-origin).
 */
const RUN_DELAY_HEADER = { 'x-kbn-test-run-delay-ms': '3000' };

const NON_TERMINAL_STATUSES: readonly string[] = NonTerminalExecutionStatuses;

/**
 * Inspects the final state after the race. Returns `true` if an orphaned
 * execution was detected: the execution is stuck in a non-terminal state
 * while the parent workflow has been deleted.
 */
async function isExecutionOrphaned(
  workflowsApi: WorkflowsApiService,
  runResult: PromiseSettledResult<{ workflowExecutionId: string }>,
  workflowId: string
): Promise<boolean> {
  // Run was rejected — no execution was created, so no orphan possible.
  if (runResult.status === 'rejected') {
    return false;
  }

  const execution = await workflowsApi.getExecution(runResult.value.workflowExecutionId);

  // Execution not found or already terminal — not an orphan.
  if (!execution?.status || !NON_TERMINAL_STATUSES.includes(execution.status)) {
    return false;
  }

  // Execution is non-terminal. Check if the workflow still exists.
  try {
    await workflowsApi.getWorkflow(workflowId);
    return false; // workflow exists — not an orphan
  } catch {
    return true; // workflow deleted + execution non-terminal = orphan
  }
}

spaceTest.describe('Hard delete TOCTOU race condition', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.afterAll(async ({ apiServices }) => {
    await apiServices.workflowsApi.deleteAll();
  });

  /**
   * Reproduces the TOCTOU race condition in hardDeleteWorkflows:
   *
   * The run() request carries a 3s delay header that postpones execution
   * document creation. Meanwhile hardDelete() fires concurrently — its
   * execution check finds no non-terminal executions (the doc doesn't
   * exist yet) and proceeds to delete the workflow. When the run's delay
   * expires it creates the execution doc for a now-deleted workflow.
   *
   * Without the fix: both succeed → execution orphaned in a non-terminal
   * state (PENDING/RUNNING) with no parent workflow → test fails.
   * With the fix (disable-first): the run is rejected because the
   * workflow was disabled before the execution check → test passes.
   */
  spaceTest(
    'hard delete during a concurrent run should not orphan the execution',
    async ({ apiServices }) => {
      const { workflowsApi } = apiServices;

      const workflow = await workflowsApi.create(LONG_RUNNING_WORKFLOW_YAML);

      // Fire run (with 3s delay before execution doc creation) and hardDelete concurrently.
      // The delete's execution check runs while the run is still sleeping.
      const [runResult, deleteResult] = await Promise.allSettled([
        workflowsApi.run(workflow.id, {}, RUN_DELAY_HEADER),
        workflowsApi.hardDelete(workflow.id),
      ]);

      // At least one must be rejected to prevent the orphan.
      const rejectedCount = [runResult, deleteResult].filter((r) => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);

      // Verify the execution is not stuck in a non-terminal state with a deleted workflow.
      const orphaned = await isExecutionOrphaned(workflowsApi, runResult, workflow.id);
      expect(orphaned).toBe(false);
    }
  );
});
