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

export const DataRegexExtractStepTypeId = 'data.regex_extract' as const;

export const ConfigSchema = z.object({
  source: z.unknown(),
  errorIfNoMatch: z.boolean().optional().default(false),
});

export const InputSchema = z.object({
  pattern: z.string().max(10000, 'Pattern exceeds maximum allowed length of 10,000 characters'),
  fields: z.record(z.string(), z.string()),
  flags: z.string().optional(),
});

export const OutputSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.union([z.record(z.string(), z.unknown()), z.null()])),
  z.null(),
]);

export type DataRegexExtractStepConfigSchema = typeof ConfigSchema;
export type DataRegexExtractStepInputSchema = typeof InputSchema;
export type DataRegexExtractStepOutputSchema = typeof OutputSchema;

export const dataRegexExtractStepCommonDefinition: CommonStepDefinition<
  DataRegexExtractStepInputSchema,
  DataRegexExtractStepOutputSchema,
  DataRegexExtractStepConfigSchema
> = {
  id: DataRegexExtractStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
