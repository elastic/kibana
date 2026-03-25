/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const LOOP_TRIGGER_ID = 'example.loopTrigger' as const;

export const loopTriggerEventSchema = z.object({
  iteration: z
    .number()
    .describe('Current iteration in the event chain (for depth guardrail demo).'),
});

export type LoopTriggerEvent = z.infer<typeof loopTriggerEventSchema>;

/** Shared trigger definition (id + eventSchema) for use by public and server. */
export const commonLoopTriggerDefinition: CommonTriggerDefinition = {
  id: LOOP_TRIGGER_ID,
  eventSchema: loopTriggerEventSchema,
};
