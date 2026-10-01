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

const databaseField = (description: string) =>
  z.string().min(1).max(64).optional().describe(description);

export const QueryInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        "Read-only SQL SELECT or WITH query to execute (e.g. SELECT id, name FROM customers WHERE status = 'active' LIMIT 100). Do not include a trailing semicolon. Use SQL that matches the cluster's engine (Aurora MySQL or Aurora PostgreSQL)."
      ),
    database: databaseField(
      'Database to run the query in. Uses the configured default database if omitted.'
    ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Maximum number of rows to return (1-1000, default 100). Extra rows are dropped and the result reports truncated: true. Still add a LIMIT to the SQL: the Data API fails any response over 1 MiB.'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListDatabasesInputSchema = lazySchema(() => z.object({}));

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    database: databaseField(
      'Database to list tables from. Uses the configured default database if omitted.'
    ),
    schema: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe(
        'PostgreSQL schema to list tables from (default "public"). Ignored for MySQL, where the database is the schema.'
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
      .describe('Name of the table or view to describe, as returned by listTables (e.g. "orders")'),
    database: databaseField(
      'Database containing the table. Uses the configured default database if omitted.'
    ),
    schema: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe('PostgreSQL schema containing the table (default "public"). Ignored for MySQL.'),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const GetSchemaInputSchema = lazySchema(() =>
  z.object({
    database: databaseField(
      'Database to retrieve the schema of. Uses the configured default database if omitted.'
    ),
    schema: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe('PostgreSQL schema to retrieve (default "public"). Ignored for MySQL.'),
  })
);
export type GetSchemaInput = z.infer<typeof GetSchemaInputSchema>;

export const ExecuteSqlInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        "Any SQL statement to execute, including INSERT, UPDATE, DELETE and DDL. Changes are committed automatically. Example: UPDATE orders SET status = 'shipped' WHERE id = 42"
      ),
    database: databaseField(
      'Database to run the statement in. Uses the configured default database if omitted.'
    ),
  })
);
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlInputSchema>;
