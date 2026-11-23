/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// PostgreSQL identifiers are limited to 63 bytes (NAMEDATALEN - 1).
const identifier = () => z.string().min(1).max(63);

export const QueryInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        "Read-only PostgreSQL SELECT or WITH query to execute (e.g. SELECT id, name FROM public.users WHERE status = 'active' ORDER BY id). Results are capped at maxRows, so a LIMIT clause is optional. Do not include a trailing semicolon."
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Maximum number of rows to return (1-1000, default: 100). Rows beyond the limit are discarded and the result is marked as truncated.'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListDatabasesInputSchema = lazySchema(() => z.object({}));

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    schema: identifier()
      .optional()
      .describe(
        'Only list tables and views in this schema (e.g. "public"). Lists all user schemas if omitted.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: identifier().describe(
      'Name of the table or view to describe (e.g. "customers", "orders"). Case-sensitive.'
    ),
    schema: identifier()
      .optional()
      .describe('Schema containing the table (e.g. "public"). Defaults to "public" if omitted.'),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const GetSchemaInputSchema = lazySchema(() =>
  z.object({
    schema: identifier()
      .optional()
      .describe(
        'Schema to describe (e.g. "public"). Defaults to "public" if omitted. Returns every table and view in the schema with its columns.'
      ),
  })
);
export type GetSchemaInput = z.infer<typeof GetSchemaInputSchema>;

export const SearchRowsInputSchema = lazySchema(() =>
  z.object({
    table: identifier().describe(
      'Name of the table to search (e.g. "customers", "products"). Case-sensitive.'
    ),
    searchTerm: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Text to search for using ILIKE pattern matching. Matches rows where any of the specified columns contain this text (case-insensitive, partial match).'
      ),
    columns: z
      .array(identifier())
      .min(1)
      .max(50)
      .describe(
        'Column names to search in (e.g. ["name", "email", "notes"]). At least one column is required. Non-text columns are matched on their text representation. Use describeTable to discover columns.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of rows to return (1-1000, default: 100)'),
    schema: identifier()
      .optional()
      .describe('Schema containing the table (e.g. "public"). Defaults to "public" if omitted.'),
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
        'SQL statement(s) to execute. Any statement type is permitted (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, etc.) and several statements may be separated by semicolons. Use with caution — this action is unrestricted.'
      ),
  })
);
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlInputSchema>;
