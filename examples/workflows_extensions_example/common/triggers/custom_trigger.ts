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

export const CUSTOM_TRIGGER_ID = 'example.customTrigger' as const;

/** Example categories for conditional subscription (workflows can filter with event.category). */
export const CUSTOM_TRIGGER_CATEGORIES = ['alerts', 'notifications', 'audit', 'demo'] as const;
export type CustomTriggerCategory = (typeof CUSTOM_TRIGGER_CATEGORIES)[number];

export const customTriggerEventSchema = z.object({
  message: z.string().describe('The message text for the event.'),
  source: z.string().optional().describe('The source that emitted the event.'),
  category: z.string().optional().describe('Category of the event.'),
  labels: z.array(z.string()).optional().describe('Optional labels for multi-value filtering.'),
  foo: z
    .object({
      bar: z.object({
        baz: z.string(),
      }),
    })
    .optional()
    .describe('Example nested property (foo.bar.baz).'),
  another: z.string().optional().describe('Another string property.'),
});

export type CustomTriggerEvent = z.infer<typeof customTriggerEventSchema>;

/** Shared trigger definition (id + eventSchema) for use by public and server. */
export const commonCustomTriggerDefinition: CommonTriggerDefinition = {
  id: CUSTOM_TRIGGER_ID,
  eventSchema: customTriggerEventSchema,
};
