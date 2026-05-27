/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

/**
 * Thrown when a workflow contains a non-linear construct that cannot be
 * executed in synchronous mode.
 *
 * Sync mode is linear-only — no branching (if/switch), no loops
 * (foreach/while), and no parallel execution. Workflows containing these
 * constructs must use the async Task-Manager–driven execution path.
 *
 * Primary enforcement happens at workflow-registration time (see
 * workflows_management); the check inside executeWorkflowSync is a
 * defense-in-depth guard against registration bypasses.
 */
export class SyncModeNotSupportedError extends Error {
  constructor(
    public readonly workflowId: string,
    public readonly offendingStep: string,
    public readonly construct: string
  ) {
    super(
      `[sync workflow] Workflow "${workflowId}" contains non-linear construct "${construct}" ` +
        `in step "${offendingStep}". ` +
        `Sync execution is linear-only. Branching, loops, and parallel steps require the async path.`
    );
    this.name = 'SyncModeNotSupportedError';
  }
}

/**
 * Step types that indicate non-linear control flow.
 * - `if` / `switch` — conditional branching
 * - `foreach` / `while` — loops
 * - `parallel` — concurrent branches
 *
 * Note: the inline `if: <expression>` field on an atomic step (a simple
 * per-step skip condition) is not the same as a step of TYPE `if`. The
 * latter opens a branching block; the former is already handled by the
 * sync executor's per-step skip logic.
 */
const NON_LINEAR_STEP_TYPES = new Set(['foreach', 'while', 'if', 'parallel', 'switch']);

/**
 * Validates that every step in `definition` has a linear step type.
 *
 * Throws `SyncModeNotSupportedError` on the first violation.
 *
 * This function is the single authoritative implementation of the linear
 * constraint — both workflow-registration validation and the
 * executeWorkflowSync entry point import and call it.
 */
export const assertWorkflowLinearForSync = (workflowId: string, definition: WorkflowYaml): void => {
  for (const step of definition.steps ?? []) {
    const stepType = (step as { type?: string }).type ?? '';
    const stepName = (step as { name?: string }).name ?? stepType;
    if (NON_LINEAR_STEP_TYPES.has(stepType)) {
      throw new SyncModeNotSupportedError(workflowId, stepName, stepType);
    }
  }
};
