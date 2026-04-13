/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { schema, type Type } from '@kbn/config-schema';
import type { SavedObjectSanitizedDoc } from '@kbn/core-saved-objects-server';

// We convert `SavedObjectSanitizedDoc` to its validation schema representation
// to ensure that we don't forget to keep the schema up-to-date. TS will complain
// if we update `SavedObjectSanitizedDoc` without making changes below.
type SavedObjectSanitizedDocSchema = {
  [K in keyof Required<SavedObjectSanitizedDoc>]: Type<SavedObjectSanitizedDoc[K]>;
};

/**
 * Base config-schema schema for a saved object.
 *
 * @internal
 */
export const baseConfigSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  type: schema.string(),
  references: schema.arrayOf(
    schema.object({
      name: schema.string(),
      type: schema.string(),
      id: schema.string(),
    }),
    { defaultValue: [], maxSize: 1000 }
  ),
  namespace: schema.maybe(schema.string()),
  namespaces: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  coreMigrationVersion: schema.maybe(schema.string()),
  typeMigrationVersion: schema.maybe(schema.string()),
  updated_at: schema.maybe(schema.string()),
  updated_by: schema.maybe(schema.string()),
  created_at: schema.maybe(schema.string()),
  created_by: schema.maybe(schema.string()),
  version: schema.maybe(schema.string()),
  originId: schema.maybe(schema.string()),
  managed: schema.maybe(schema.boolean()),
  accessControl: schema.maybe(
    schema.object({
      owner: schema.string(),
      accessMode: schema.oneOf([schema.literal('write_restricted'), schema.literal('default')]),
    })
  ),
  attributes: schema.recordOf(schema.string(), schema.maybe(schema.any())),
} satisfies SavedObjectSanitizedDocSchema);

/**
 * Base Zod schema for a saved object.
 *
 * @internal
 */
export const baseZodSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  references: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        id: z.string(),
      })
    )
    .max(1000)
    .default([]),
  namespace: z.string().optional(),
  namespaces: z.array(z.string()).max(100).optional(),
  migrationVersion: z.record(z.string(), z.string()).optional(),
  coreMigrationVersion: z.string().optional(),
  typeMigrationVersion: z.string().optional(),
  updated_at: z.string().optional(),
  updated_by: z.string().optional(),
  created_at: z.string().optional(),
  created_by: z.string().optional(),
  version: z.string().optional(),
  originId: z.string().optional(),
  managed: z.boolean().optional(),
  accessControl: z
    .object({
      owner: z.string(),
      accessMode: z.enum(['write_restricted', 'default']),
    })
    .optional(),
  attributes: z.record(z.string(), z.any().optional()),
}) satisfies z.ZodType<SavedObjectSanitizedDoc>;
