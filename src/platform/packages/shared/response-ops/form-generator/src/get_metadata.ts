/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Helper to retrieve metadata from Zod schemas
 *
 * Uses Zod v4's native .meta() method to store and retrieve metadata
 */

import { z } from '@kbn/zod/v4';
import type { FieldMeta } from './schema_metadata';
import type { WidgetType } from './widgets';

export interface UIMetadata {
  widget?: WidgetType;
  label?: string;
  placeholder?: string;
  default?: unknown;
  widgetOptions?: {
    label?: string;
    placeholder?: string;
    default?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function getMeta(schema: z.ZodTypeAny): UIMetadata | undefined {
  return z.globalRegistry.get(schema);
}

export function getTypedMeta(schema: z.ZodTypeAny): FieldMeta | undefined {
  return z.globalRegistry.get(schema) as FieldMeta | undefined;
}
