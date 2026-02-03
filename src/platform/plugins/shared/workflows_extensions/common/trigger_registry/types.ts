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
 * Common trigger definition fields shared between server and public.
 * Config type is automatically inferred from the schema.
 */
export interface CommonTriggerDefinition<ConfigSchema extends z.ZodType = z.ZodType> {
  /**
   * Unique identifier for this trigger type.
   * Should follow a namespaced format (e.g., "streams.upsertStream", "alerts.fired").
   */
  id: string;

  /**
   * Zod schema for validating trigger configuration (the `with` block).
   * Defines the structure and validation rules for the trigger's parameters.
   * The config type is automatically inferred from this schema.
   */
  configSchema: ConfigSchema;
}
