/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const DEFAULT_FIND_LIMIT = 100;
const MAX_FIND_LIMIT = 1000;

const DatabaseFieldSchema = z
  .string()
  .optional()
  .describe('Database name. Defaults to the connector default database.');

const CollectionFieldSchema = z.string().min(1).describe('Name of the MongoDB collection.');

// ---- Read / tool actions ----

export const FindInputSchema = lazySchema(() =>
  z.object({
    collection: CollectionFieldSchema,
    database: DatabaseFieldSchema,
    filter: z
      .record(z.unknown())
      .optional()
      .describe(
        'MongoDB query filter document, e.g. { "status": "active", "age": { "$gt": 18 } }. Omit to return all documents.'
      ),
    projection: z
      .record(z.unknown())
      .optional()
      .describe(
        'Fields to include (1) or exclude (0), e.g. { "name": 1, "_id": 0 }. Cannot mix inclusion and exclusion except for _id.'
      ),
    sort: z
      .record(z.number())
      .optional()
      .describe(
        'Sort specification, e.g. { "createdAt": -1 } for descending. 1 = ascending, -1 = descending.'
      ),
    limit: z
      .number()
      .min(1)
      .max(MAX_FIND_LIMIT)
      .optional()
      .default(DEFAULT_FIND_LIMIT)
      .describe(
        `Maximum number of documents to return (1–${MAX_FIND_LIMIT}, default ${DEFAULT_FIND_LIMIT}).`
      ),
  })
);
export type FindInput = z.infer<typeof FindInputSchema>;

export const AggregateInputSchema = lazySchema(() =>
  z.object({
    collection: CollectionFieldSchema,
    database: DatabaseFieldSchema,
    pipeline: z
      .array(z.record(z.unknown()))
      .min(1)
      .describe(
        'MongoDB aggregation pipeline as an array of stage objects, e.g. [{ "$match": { "status": "active" } }, { "$group": { "_id": "$category", "total": { "$sum": 1 } } }].'
      ),
    limit: z
      .number()
      .min(1)
      .max(MAX_FIND_LIMIT)
      .optional()
      .describe(
        `Cap on documents returned after the pipeline completes (1–${MAX_FIND_LIMIT}). Prefer adding a $limit stage to the pipeline instead.`
      ),
  })
);
export type AggregateInput = z.infer<typeof AggregateInputSchema>;

export const ListCollectionsInputSchema = lazySchema(() =>
  z.object({
    database: DatabaseFieldSchema,
  })
);
export type ListCollectionsInput = z.infer<typeof ListCollectionsInputSchema>;

// ---- Write / workflow-only actions ----

export const InsertOneInputSchema = lazySchema(() =>
  z.object({
    collection: CollectionFieldSchema,
    database: DatabaseFieldSchema,
    document: z
      .record(z.unknown())
      .describe('Document to insert. Do not include _id unless you want to set it explicitly.'),
  })
);
export type InsertOneInput = z.infer<typeof InsertOneInputSchema>;

export const UpdateOneInputSchema = lazySchema(() =>
  z.object({
    collection: CollectionFieldSchema,
    database: DatabaseFieldSchema,
    filter: z
      .record(z.unknown())
      .describe('Filter to match the document to update, e.g. { "_id": "abc" }.'),
    update: z
      .record(z.unknown())
      .describe(
        'Update operators or replacement document, e.g. { "$set": { "status": "inactive" } }.'
      ),
    upsert: z
      .boolean()
      .optional()
      .describe('If true, insert a new document when no document matches the filter.'),
  })
);
export type UpdateOneInput = z.infer<typeof UpdateOneInputSchema>;

export const DeleteOneInputSchema = lazySchema(() =>
  z.object({
    collection: CollectionFieldSchema,
    database: DatabaseFieldSchema,
    filter: z
      .record(z.unknown())
      .describe('Filter to match the document to delete, e.g. { "_id": "abc" }.'),
  })
);
export type DeleteOneInput = z.infer<typeof DeleteOneInputSchema>;
