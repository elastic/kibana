/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the setvar step.
 */
export const SetVarStepTypeId = 'example.setVariable';

/**
 * Input schema for the setvar step.
 * Uses variables structure with key->value pairs.
 */
export const InputSchema = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * Output schema for the setvar step.
 * Uses variables structure with key->value pairs.
 */
export const OutputSchema = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export type SetVarStepInputSchema = typeof InputSchema;
export type SetVarStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for SetVar step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const setVarStepCommonDefinition: CommonStepDefinition<
  SetVarStepInputSchema,
  SetVarStepOutputSchema
> = {
  id: SetVarStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
