/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractSchemaPropertyPaths } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

/**
 * Event-schema introspection for hover + KQL stub fields.
 */
export interface EventSchemaPropertyInfo {
  name: string;
  type: string;
  description?: string;
}

/**
 * Extract event schema properties from a Zod schema (payload shape under `triggers[].on.condition` —
 * paths are relative to `event.` in KQL).
 */
export function getEventSchemaProperties(eventSchema: z.ZodType): EventSchemaPropertyInfo[] {
  try {
    const rows = extractSchemaPropertyPaths(eventSchema, { includeMetadata: true });
    return rows.map((row) => ({
      name: row.path,
      type: row.displayType ?? row.type,
      description: row.description,
    }));
  } catch {
    return [];
  }
}
