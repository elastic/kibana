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
 * Shared trigger contract (common to server and public).
 *
 * Constraints (enforced at registration):
 * - id: globally unique, namespaced format <solution>.<event>
 * - eventSchema: must be a Zod object schema that rejects unknown fields
 */
export interface CommonTriggerDefinition<EventSchema extends z.ZodType = z.ZodType> {
  /** Globally unique, namespaced identifier (e.g. cases.updated, alerts.severity_high) */
  id: string;
  /** Payload contract (Zod object schema; must reject unknown fields by default) */
  eventSchema: EventSchema;
}
