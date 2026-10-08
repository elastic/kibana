/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const schemaName = () => z.string().min(1).max(128);

export const QueryInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'Read-only T-SQL SELECT or WITH query to execute. Use TOP or OFFSET/FETCH to bound results (e.g. SELECT TOP ' +
          "100 id, name FROM dbo.Customers WHERE Status = 'active'). Do not include a trailing semicolon."
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Maximum number of rows to return (1-1000, default: 100). Rows beyond the limit are discarded and the result ' +
          'is marked as truncated.'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListDatabasesInputSchema = lazySchema(() => z.object({}));

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    schema: schemaName()
      .optional()
      .describe(
        'Only list tables and views in this schema (e.g. "dbo"). Lists all schemas if omitted.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .min(1)
      .max(128)
      .describe('Name of the table or view to describe (e.g. "Customers", "Orders")'),
    schema: schemaName()
      .optional()
      .describe('Schema containing the table (e.g. "dbo"). Defaults to "dbo" if omitted.'),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const SearchRowsInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .min(1)
      .max(128)
      .describe('Name of the table to search (e.g. "Customers", "Products")'),
    searchTerm: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Text to search for using LIKE pattern matching. Matches rows where any of the specified columns contain ' +
          'this text (case-insensitive, partial match).'
      ),
    columns: z
      .array(z.string().min(1).max(128))
      .min(1)
      .max(50)
      .describe(
        'Text column names to search in (e.g. ["Name", "Email", "Notes"]). At least one column is required. Columns ' +
          'must be character types (char, varchar, nchar, nvarchar); use describeTable to discover them.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of rows to return (1-1000, default: 100)'),
    schema: schemaName()
      .optional()
      .describe('Schema containing the table (e.g. "dbo"). Defaults to "dbo" if omitted.'),
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
        'T-SQL statement to execute. Any statement type is permitted (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ' +
          'etc.). Use with caution — this action is unrestricted.'
      ),
  })
);
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlInputSchema>;
