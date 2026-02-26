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

export const CUSTOM_TRIGGER_ID = 'example.custom_trigger' as const;

export const customTriggerEventSchema = z.object({
  message: z.string().describe('The message text for the event.'),
  source: z.string().optional().describe('The source that emitted the event.'),
});

export type CustomTriggerEvent = z.infer<typeof customTriggerEventSchema>;

/** Shared trigger definition (id + eventSchema) for use by public and server. */
export const commonCustomTriggerDefinition: CommonTriggerDefinition = {
  id: CUSTOM_TRIGGER_ID,
  eventSchema: customTriggerEventSchema,
};
