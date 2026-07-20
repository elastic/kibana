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
      .describe(
        'Name of the collection to query. Use listCollections to discover available names.'
      ),
    database: z
      .string()
      .optional()
      .describe(
        'Database to query. Defaults to the database in the connection URI path if omitted.'
      ),
    filter: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'MongoDB query filter (MQL). Omit or pass {} to return all documents. ' +
          'Examples: {"status": "active"}, {"age": {"$gt": 30}}, {"tags": {"$in": ["a","b"]}}.'
      ),
    projection: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Fields to include (1) or exclude (0). Examples: {"name": 1, "email": 1, "_id": 0}. ' +
          'Omit to return all fields.'
      ),
    sort: z
      .record(z.string(), z.union([z.literal(1), z.literal(-1)]))
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
      .describe(
        'Name of the collection to aggregate. Use listCollections to discover available names.'
      ),
    database: z
      .string()
      .optional()
      .describe(
        'Database to query. Defaults to the database in the connection URI path if omitted.'
      ),
    pipeline: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .describe(
        'MongoDB aggregation pipeline — an ordered array of stage objects. ' +
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
    collection: z.string().min(1).describe('Name of the collection to count documents in.'),
    database: z
      .string()
      .optional()
      .describe(
        'Database to query. Defaults to the database in the connection URI path if omitted.'
      ),
    filter: z
      .record(z.string(), z.unknown())
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
      .optional()
      .describe(
        'Database to list collections from. Defaults to the database in the connection URI path if omitted.'
      ),
    nameFilter: z
      .string()
      .optional()
      .describe(
        'Optional substring to filter collection names (case-sensitive). ' +
          'Omit to list all collections in the database.'
      ),
  })
);
export type ListCollectionsInput = z.infer<typeof ListCollectionsInputSchema>;
