/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../trigger_registry/types';

export const MANUAL_TRIGGER_ID = 'workflows.manual' as const;

export const manualTriggerEventSchema = z.object({
  inputs: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('User-provided inputs for the workflow.'),
});

export type ManualTriggerEvent = z.infer<typeof manualTriggerEventSchema>;

export const commonManualTriggerDefinition: CommonTriggerDefinition<
  typeof manualTriggerEventSchema
> = {
  id: MANUAL_TRIGGER_ID,
  eventSchema: manualTriggerEventSchema,
};
