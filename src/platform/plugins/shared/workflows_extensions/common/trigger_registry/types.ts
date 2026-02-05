/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

/**
 * Immutable, semantic contract for a workflow trigger.
 * Describes an event type and its payload shape; no workflow or execution references.
 *
 * Constraints (enforced at registration):
 * - id: globally unique, namespaced format <solution>.<event>
 * - eventSchema: must be a Zod object schema that rejects unknown fields
 * - examples: each item must be an event payload that validates against eventSchema
 */
export interface TriggerDefinition<EventSchema extends z.ZodType = z.ZodType> {
  /** Globally unique, namespaced identifier (e.g. cases.updated, alerts.severity_high) */
  id: string;
  /** Semantic meaning of the trigger */
  description: string;
  /** Payload contract (Zod object schema; must reject unknown fields by default) */
  eventSchema: EventSchema;
  /** Optional example event payloads for authoring help; each must validate against eventSchema */
  examples?: Record<string, unknown>[];
}
