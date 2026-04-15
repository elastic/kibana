/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';

/**
 * Validates that a workflow is in a runnable state before execution.
 * Throws a descriptive error if any validation check fails.
 *
 * Uses TypeScript assertion signature so that after a successful call,
 * the compiler narrows `workflow` to a non-null `WorkflowDetailDto`
 * with a guaranteed `definition`.
 */
export function validateWorkflowForExecution(
  workflow: WorkflowDetailDto | null,
  workflowId: string
): asserts workflow is WorkflowDetailDto & {
  definition: NonNullable<WorkflowDetailDto['definition']>;
} {
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  if (!workflow.definition) {
    throw new Error(`Workflow definition not found: ${workflowId}`);
  }

  if (!workflow.valid) {
    throw new Error(`Workflow is not valid: ${workflowId}`);
  }

  if (!workflow.enabled) {
    throw new Error(`Workflow is disabled: ${workflowId}. Enable the workflow to run it.`);
  }
}
