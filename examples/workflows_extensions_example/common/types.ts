/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { z } from '@kbn/zod';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { createStepTypeId } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the setvar step.
 */
export const SETVAR_STEP_ID = createStepTypeId('workflows_step_example.setvar');

/**
 * Input schema for the setvar step.
 * Uses variables structure with key->value pairs.
 */
export const SETVAR_INPUT_SCHEMA = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * Output schema for the setvar step.
 * Uses variables structure with key->value pairs.
 */
export const SETVAR_OUTPUT_SCHEMA = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * Type inference for setvar step input.
 */
export type SetVarStepInput = z.infer<typeof SETVAR_INPUT_SCHEMA>;

/**
 * Type inference for setvar step output.
 */
export type SetVarStepOutput = z.infer<typeof SETVAR_OUTPUT_SCHEMA>;

/**
 * Common step definition for setvar step.
 * This is shared between server and public implementations.
 */
export const SETVAR_STEP_DEFINITION: Pick<
  CommonStepDefinition,
  'id' | 'inputSchema' | 'outputSchema'
> = {
  id: SETVAR_STEP_ID,
  inputSchema: SETVAR_INPUT_SCHEMA,
  outputSchema: SETVAR_OUTPUT_SCHEMA,
};
