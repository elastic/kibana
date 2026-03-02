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

export const DataParseJsonStepTypeId = 'data.parse_json' as const;

export const ConfigSchema = z.object({
  source: z.unknown(),
});

export const InputSchema = z.object({});

export const OutputSchema = z.unknown();

export type DataParseJsonStepConfigSchema = typeof ConfigSchema;
export type DataParseJsonStepInputSchema = typeof InputSchema;
export type DataParseJsonStepOutputSchema = typeof OutputSchema;

export const dataParseJsonStepCommonDefinition: CommonStepDefinition<
  DataParseJsonStepInputSchema,
  DataParseJsonStepOutputSchema,
  DataParseJsonStepConfigSchema
> = {
  id: DataParseJsonStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
