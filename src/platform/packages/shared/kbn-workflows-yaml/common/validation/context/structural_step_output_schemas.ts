/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PARALLEL_BRANCH_NAME_MAX_LENGTH } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

/**
 * Output schemas for built-in structural (control-flow) step types.
 * Keyed by `stepType` (e.g. 'if', 'foreach', 'retry', 'wait').
 *
 * These are separate from the WorkflowsExtensions registry because structural
 * steps don't have user-provided handlers — they are implemented as dedicated
 * NodeImplementation classes in the execution engine.
 */
/**
 * One entry of the index-aligned `results` array a `parallel` step exposes.
 * Mirrors `ParallelBranchResult` in the execution engine; `output`/`error` are
 * branch-specific so they stay permissive (`unknown`).
 */
const parallelBranchResultSchema = z.object({
  index: z.number(),
  key: z.unknown().optional(),
  status: z.enum(['completed', 'failed', 'skipped', 'timed_out']),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
  durationMs: z.number().optional(),
});

// Static-mode only: results keyed by branch name. Mirrors `ParallelNamedBranchResult`
// in the execution engine so `steps.<id>.output.branches.<name>.{status,output,error}`
// gets editor validation/autocomplete.
const parallelNamedBranchResultSchema = z.object({
  status: z.enum(['completed', 'failed', 'skipped', 'timed_out']),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
});

export const structuralStepOutputSchemas: Record<string, z.ZodSchema> = {
  if: z.object({
    conditionResult: z.boolean(),
  }),
  // Aggregate output of a `parallel` step (dynamic fan-out or static branches).
  // Mirrors `ParallelStepOutput` in the execution engine so authors get editor
  // validation/autocomplete for `steps.<id>.output.{status,total,succeeded,...}`
  // and, in static mode, the name-keyed `branches` projection.
  parallel: z.object({
    results: z.array(parallelBranchResultSchema),
    total: z.number(),
    succeeded: z.number(),
    failed: z.number(),
    status: z.enum(['completed', 'failed']),
    branches: z
      .record(z.string().max(PARALLEL_BRANCH_NAME_MAX_LENGTH), parallelNamedBranchResultSchema)
      .optional(),
  }),
};
