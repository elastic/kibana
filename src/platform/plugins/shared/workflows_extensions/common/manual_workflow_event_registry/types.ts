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
 * Shared definition for a typed event that can be selected on a manual workflow trigger.
 */
export interface ManualWorkflowEventDefinition<EventSchema extends z.ZodType = z.ZodType> {
  /** Globally unique, namespaced event identifier. */
  id: string;
  /** Payload contract supplied when the manual workflow is run. */
  eventSchema: EventSchema;
  /** Short human-readable event name. */
  title: string;
  /** User-facing description of the event payload and purpose. */
  description: string;
}
