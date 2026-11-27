/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IfStepOutputSchema, ParallelStepOutputSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

/**
 * Output schemas for built-in structural (control-flow) step types, keyed by `stepType`.
 * Defined in `@kbn/workflows` and shared with the built-in step definitions,
 * so the editor and the AI step catalog read the same schema.
 */
export const structuralStepOutputSchemas: Record<string, z.ZodSchema> = {
  if: IfStepOutputSchema,
  parallel: ParallelStepOutputSchema,
};
