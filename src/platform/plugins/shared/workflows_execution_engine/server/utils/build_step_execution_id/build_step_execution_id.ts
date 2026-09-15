/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from '@kbn/crypto';
import type { StackFrame } from '@kbn/workflows';

/**
 * Generates a unique identifier for a step execution by combining execution ID, path, and step ID,
 * then hashing the result with SHA-256.
 * The ID is deterministic and predictable because it's derived from static
 * workflow state components (execution ID, path, step ID) rather than random values.
 * This ensures the same step in the same execution context will always generate
 * the same ID, enabling reliable step tracking and idempotent operations.
 *
 * @param executionId - The unique identifier of the workflow execution
 * @param stepId - The unique identifier of the step within the workflow
 * @param stackFrames - An array of StackFrame objects representing the hierarchical path to the step
 * @returns A SHA-256 hash string representing the unique step execution identifier
 *
 * @example
 * ```typescript
 * const stackFrames = [{ stepId: 'foreachstep', subScopeId: '1' }];
 * const stepExecId = buildStepExecutionId(
 *   'workflow-exec-abc123',
 *   'connector-send-email',
 *   stackFrames
 * );
 * // Returns: "7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"
 * ```
 */
export function buildStepExecutionId(
  executionId: string,
  stepId: string,
  stackFrames: StackFrame[]
): string {
  return createSHA256Hash([executionId, buildStepScopeKey(stepId, stackFrames)].join('_'));
}

/**
 * The execution-independent half of {@link buildStepExecutionId}: a step's
 * identity within its scope, without the execution it ran in.
 *
 * A parallel branch runs as its own execution but inherits the parent's scope
 * stack, so a scope frame the branch inherited hashes to the parent's step
 * execution id, not one derivable from the branch's own execution id. Keying
 * ancestor lookups on the scope instead lets a branch resolve the scopes it
 * inherited (e.g. the `foreach` item its parallel frame carries).
 */
export function buildStepScopeKey(stepId: string, stackFrames: StackFrame[]): string {
  const stepPath = stackFrames
    .map((frame) => [frame.stepId, ...frame.nestedScopes.map((s) => s.scopeId || '')])
    .flat();
  return [...stepPath, stepId].join('_');
}
