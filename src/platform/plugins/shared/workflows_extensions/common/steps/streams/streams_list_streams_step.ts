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

export const StreamsListStreamsStepTypeId = 'streams.listStreams';

export const InputSchema = z.object({});

export const OutputSchema = z.object({
  streams: z.array(z.record(z.string(), z.unknown())),
});

export type StreamsListStreamsStepInputSchema = typeof InputSchema;
export type StreamsListStreamsStepOutputSchema = typeof OutputSchema;

export const streamsListStreamsStepCommonDefinition: CommonStepDefinition<
  StreamsListStreamsStepInputSchema,
  StreamsListStreamsStepOutputSchema
> = {
  id: StreamsListStreamsStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
