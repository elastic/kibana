/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-nodejs-modules
import crypto from 'crypto';
import type { StackFrame } from '../../..';

/**
 * Generates a unique identifier for a step execution by combining execution ID, path, and step ID,
 * then hashing the result with SHA-256 truncated to 128 bits (32 hex characters).
 * The ID is deterministic and predictable because it's derived from static
 * workflow state components (execution ID, path, step ID) rather than random values.
 * This ensures the same step in the same execution context will always generate
 * the same ID, enabling reliable step tracking and idempotent operations.
 *
 * 128 bits provides the same collision resistance as UUID v4 (~10^-28 at 100k documents).
 *
 * @param executionId - The unique identifier of the workflow execution
 * @param stepId - The unique identifier of the step within the workflow
 * @param stackFrames - An array of StackFrame objects representing the hierarchical path to the step
 * @returns A 32-character hex string (128-bit truncated SHA-256) representing the unique step execution identifier
 *
 * @example
 * ```typescript
 * const stackFrames = [{ stepId: 'foreachstep', subScopeId: '1' }];
 * const stepExecId = buildStepExecutionId(
 *   'workflow-exec-abc123',
 *   'connector-send-email',
 *   stackFrames
 * );
 * // Returns: "7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c"
 * ```
 */
export function buildStepExecutionId(
  executionId: string,
  stepId: string,
  stackFrames: StackFrame[]
): string {
  const stepPath = stackFrames
    .map((frame) => [frame.stepId, ...frame.nestedScopes.map((s) => s.scopeId || '')])
    .flat();
  const generatedId = [executionId, ...stepPath, stepId].join('_');
  // Truncate SHA-256 (256 bits) to 128 bits (32 hex chars).
  //
  // Why 128 bits:
  // - Matches UUID v4 collision resistance — the industry standard for unique identifiers.
  // - Birthday paradox collision probability at 100k docs per index: ~10^-28 (1 in 10^28).
  //   Even at 10 million docs the probability is ~10^-24 — astronomically safe.
  // - Full SHA-256 (64 hex chars) is overkill by ~10^39 orders of magnitude for our scale.
  //
  // Why truncated SHA-256 rather than a shorter hash algorithm:
  // - crypto.createHash('sha256') is built-in with zero dependencies.
  // - Truncating a cryptographic hash preserves uniform distribution — the first 128 bits
  //   of SHA-256 are as collision-resistant as any purpose-built 128-bit hash.
  // - Performance is identical for our input sizes (sub-microsecond).
  //
  // The step execution ID is later combined with an index suffix and base64url-encoded
  // to form the final Elasticsearch document _id. Halving the hash from 64 to 32 hex chars
  // reduces the encoded ID from ~95 to ~52 characters.
  const hashedId = crypto.createHash('sha256').update(generatedId).digest('hex').slice(0, 32);
  return hashedId;
}
