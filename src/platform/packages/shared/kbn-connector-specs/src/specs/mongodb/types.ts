/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// find — query documents in a collection
// =============================================================================

export const FindInputSchema = lazySchema(() =>
  z.object({
    collection: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the collection to query. Use listCollections to discover available names.'
      ),
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to query. Defaults to the database in the connection URI path if omitted.'
      ),
    filter: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 filter fields is allowed.',
      })
      .optional()
      .describe(
        'MongoDB query filter (MQL). Omit or pass {} to return all documents. ' +
          'Examples: {"status": "active"}, {"age": {"$gt": 30}}, {"tags": {"$in": ["a","b"]}}.'
      ),
    projection: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 projection fields is allowed.',
      })
      .optional()
      .describe(
        'Fields to include (1) or exclude (0). Examples: {"name": 1, "email": 1, "_id": 0}. ' +
          'Omit to return all fields.'
      ),
    sort: z
      .record(z.string().max(200), z.union([z.literal(1), z.literal(-1)]))
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 sort fields is allowed.',
      })
      .optional()
      .describe(
        'Sort order for results. 1 = ascending, -1 = descending. ' +
          'Example: {"createdAt": -1} returns newest first.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1_000)
      .optional()
      .default(100)
      .describe('Maximum number of documents to return (1–1000). Defaults to 100.'),
    skip: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Number of documents to skip before returning results. Use with limit for pagination.'
      ),
  })
);
export type FindInput = z.infer<typeof FindInputSchema>;

// =============================================================================
// aggregate — run an aggregation pipeline on a collection
// =============================================================================

export const AggregateInputSchema = lazySchema(() =>
  z.object({
    collection: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the collection to aggregate. Use listCollections to discover available names.'
      ),
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to query. Defaults to the database in the connection URI path if omitted.'
      ),
    pipeline: z
      .array(
        z.record(z.string().max(200), z.unknown()).refine((obj) => Object.keys(obj).length <= 100, {
          message: 'A maximum of 100 fields per pipeline stage is allowed.',
        })
      )
      .min(1)
      .max(100)
      .describe(
        'MongoDB aggregation pipeline — an ordered array of stage objects (maximum 100 stages). ' +
          'Example: [{"$match": {"status": "active"}}, {"$group": {"_id": "$region", "count": {"$sum": 1}}}]. ' +
          'Write stages ($out, $merge) and code-execution stages ($function, $accumulator) are not allowed.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1_000)
      .optional()
      .default(100)
      .describe(
        'Maximum number of documents to return from the final pipeline stage (1–1000). ' +
          'A $limit stage is appended automatically if the pipeline does not already end with one. Defaults to 100.'
      ),
  })
);
export type AggregateInput = z.infer<typeof AggregateInputSchema>;

// =============================================================================
// count — count documents matching a filter
// =============================================================================

export const CountInputSchema = lazySchema(() =>
  z.object({
    collection: z
      .string()
      .min(1)
      .max(200)
      .describe('Name of the collection to count documents in.'),
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to query. Defaults to the database in the connection URI path if omitted.'
      ),
    filter: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 filter fields is allowed.',
      })
      .optional()
      .describe(
        'MongoDB query filter. Omit or pass {} to count all documents in the collection. ' +
          'Example: {"status": "active"}.'
      ),
  })
);
export type CountInput = z.infer<typeof CountInputSchema>;

// =============================================================================
// listCollections — list collections in the configured database
// =============================================================================

export const ListCollectionsInputSchema = lazySchema(() =>
  z.object({
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to list collections from. Defaults to the database in the connection URI path if omitted.'
      ),
    nameFilter: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Optional substring to filter collection names (case-sensitive). ' +
          'Omit to list all collections in the database.'
      ),
  })
);
export type ListCollectionsInput = z.infer<typeof ListCollectionsInputSchema>;

// =============================================================================
// insertOne — insert a single document into a collection
// =============================================================================

export const InsertOneInputSchema = lazySchema(() =>
  z.object({
    collection: z.string().min(1).max(200).describe('Name of the collection to insert into.'),
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to write to. Defaults to the database in the connection URI path if omitted.'
      ),
    document: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 document fields is allowed.',
      })
      .describe(
        'Document to insert. Do not include _id unless you want to set it explicitly. ' +
          'Example: {"name": "Alice", "status": "active"}.'
      ),
  })
);
export type InsertOneInput = z.infer<typeof InsertOneInputSchema>;

// =============================================================================
// updateOne — update a single document matching a filter
// =============================================================================

export const UpdateOneInputSchema = lazySchema(() =>
  z.object({
    collection: z.string().min(1).max(200).describe('Name of the collection to update.'),
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to write to. Defaults to the database in the connection URI path if omitted.'
      ),
    filter: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 filter fields is allowed.',
      })
      .describe('Filter to match the document to update. Example: {"_id": "abc"}.'),
    update: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 update fields is allowed.',
      })
      .describe(
        'Update operators or replacement document. ' + 'Example: {"$set": {"status": "inactive"}}.'
      ),
    upsert: z
      .boolean()
      .optional()
      .describe('If true, insert a new document when no document matches the filter.'),
  })
);
export type UpdateOneInput = z.infer<typeof UpdateOneInputSchema>;

// =============================================================================
// deleteOne — delete a single document matching a filter
// =============================================================================

export const DeleteOneInputSchema = lazySchema(() =>
  z.object({
    collection: z.string().min(1).max(200).describe('Name of the collection to delete from.'),
    database: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Database to write to. Defaults to the database in the connection URI path if omitted.'
      ),
    filter: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 100, {
        message: 'A maximum of 100 filter fields is allowed.',
      })
      .describe('Filter to match the document to delete. Example: {"_id": "abc"}.'),
  })
);
export type DeleteOneInput = z.infer<typeof DeleteOneInputSchema>;
