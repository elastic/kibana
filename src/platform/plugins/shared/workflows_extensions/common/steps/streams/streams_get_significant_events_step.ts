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

export const StreamsGetSignificantEventsStepTypeId = 'streams.getSignificantEvents';

export const InputSchema = z.object({
  name: z.string().describe('The name of the stream to retrieve significant events for'),
  from: z.string().describe('Start time in ISO 8601 format'),
  to: z.string().describe('End time in ISO 8601 format'),
  bucketSize: z.string().describe('Bucket size for aggregation (e.g., "1h", "1d")'),
  query: z
    .string()
    .optional()
    .describe('Optional query string to filter significant events on metadata fields'),
});

export const OutputSchema = z.object({
  significant_events: z.array(z.record(z.string(), z.unknown())),
  aggregated_occurrences: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),
});

export type StreamsGetSignificantEventsStepInputSchema = typeof InputSchema;
export type StreamsGetSignificantEventsStepOutputSchema = typeof OutputSchema;

export const streamsGetSignificantEventsStepCommonDefinition: CommonStepDefinition<
  StreamsGetSignificantEventsStepInputSchema,
  StreamsGetSignificantEventsStepOutputSchema
> = {
  id: StreamsGetSignificantEventsStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
