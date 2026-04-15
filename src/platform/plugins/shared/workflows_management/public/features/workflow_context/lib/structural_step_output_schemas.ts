/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Output schemas for built-in structural (control-flow) step types.
 * Keyed by `stepType` (e.g. 'if', 'foreach', 'retry', 'wait').
 *
 * These are separate from the WorkflowsExtensions registry because structural
 * steps don't have user-provided handlers — they are implemented as dedicated
 * NodeImplementation classes in the execution engine.
 */
export const structuralStepOutputSchemas: Record<string, z.ZodSchema> = {
  if: z.object({
    conditionResult: z.boolean(),
  }),
};
