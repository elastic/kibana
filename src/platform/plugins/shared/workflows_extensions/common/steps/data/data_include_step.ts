/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataIncludeStepTypeId = 'data.include';

/**
 * Fields spec: object whose keys are field names. Value is either null/empty
 * (include the field as-is) or a nested object (apply include to that branch).
 * Parsed from YAML; structure is validated at runtime in the handler.
 */
export const ConfigSchema = z.object({
  item: z.unknown(),
});

export const InputSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});

export const OutputSchema = z.union([
  z.array(z.record(z.string(), z.unknown())),
  z.record(z.string(), z.unknown()),
]);

export type DataIncludeStepConfigSchema = typeof ConfigSchema;
export type DataIncludeStepInputSchema = typeof InputSchema;
export type DataIncludeStepOutputSchema = typeof OutputSchema;

export const dataIncludeStepCommonDefinition: CommonStepDefinition<
  DataIncludeStepInputSchema,
  DataIncludeStepOutputSchema,
  DataIncludeStepConfigSchema
> = {
  id: DataIncludeStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
