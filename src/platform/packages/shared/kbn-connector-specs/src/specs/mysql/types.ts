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
// Action input schemas & inferred types
// =============================================================================

export const QueryInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'Read-only SQL SELECT or WITH query to execute. Include a LIMIT clause to bound results (e.g. SELECT id, name FROM users WHERE status = "active" LIMIT 100). Do not include a trailing semicolon.'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListDatabasesInputSchema = lazySchema(() => z.object({}));
export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    database: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe(
        'Database name to list tables from. Uses the configured default database if omitted.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .min(1)
      .max(64)
      .describe('Name of the table to describe (e.g. "users", "orders")'),
    database: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe(
        'Database name containing the table. Uses the configured default database if omitted.'
      ),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const SearchRowsInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .min(1)
      .max(64)
      .describe('Name of the table to search (e.g. "users", "products")'),
    searchTerm: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Text to search for using SQL LIKE pattern matching. Matches rows where any of the specified columns contain this text (case-insensitive, partial match).'
      ),
    columns: z
      .array(z.string().min(1).max(64))
      .min(1)
      .max(50)
      .describe(
        'Column names to search in (e.g. ["name", "email", "notes"]). At least one column is required. Use describeTable to discover available columns.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of rows to return (1-1000, default: 100)'),
    database: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe(
        'Database name containing the table. Uses the configured default database if omitted.'
      ),
  })
);
export type SearchRowsInput = z.infer<typeof SearchRowsInputSchema>;

export const ExecuteSqlInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'SQL statement to execute. Any statement type is permitted (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, etc.). Use with caution — this action is unrestricted.'
      ),
  })
);
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlInputSchema>;
