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

/**
 * Trigger type ID for the cases.update trigger.
 */
export const CasesUpdateTriggerId = 'cases.update';

/**
 * Event schema for the cases.update trigger.
 * Emitted when a case is updated via the Cases API.
 */
export const CasesUpdateEventSchema = z.object({
  case: z.object({
    id: z.string(),
    owner: z.string(),
    title: z.string().optional(),
    status: z.string().optional(),
    severity: z.string().optional(),
    version: z.string().optional(),
    updatedAt: z.string().optional(), // ISO timestamp
  }),
});

export type CasesUpdateEventSchema = z.infer<typeof CasesUpdateEventSchema>;

/**
 * Common trigger definition for cases.update trigger.
 * This is shared between server and public implementations.
 */
export const casesUpdateTriggerDefinition: CommonTriggerDefinition<typeof CasesUpdateEventSchema> =
  {
    id: CasesUpdateTriggerId,
    description: 'Emitted when a case is updated',
    eventSchema: CasesUpdateEventSchema,
  };
