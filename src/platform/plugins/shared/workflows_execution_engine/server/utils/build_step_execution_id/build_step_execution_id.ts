/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackEntry } from '@kbn/workflows';
import crypto from 'crypto';
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
 * @param path - An array of StackEntry objects representing the hierarchical path to the step
 * @returns A SHA-256 hash string representing the unique step execution identifier
 *
 * @example
 * ```typescript
 * const stepExecId = buildStepExecutionId(
 *   'exec-123',
 *   'some-connector-step',
 *   [{ stepId: 'foreachstep', subScopeId: '1' }]
 * );
 * // Returns: "a1b2c3d4e5f6..." (SHA-256 hash)
 * ```
 */
export function buildStepExecutionId(
  executionId: string,
  stepId: string,
  path: StackEntry[]
): string {
  const generatedId = [
    executionId,
    ...path.flatMap((stackEntry) => [
      stackEntry.stepId,
      ...stackEntry.scope.map((x) => x.scopeId).filter((x) => !!x),
    ]),
    stepId,
  ].join('_');
  const hashedId = crypto.createHash('sha256').update(generatedId).digest('hex');
  return hashedId;
}
