/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const identifier = () => z.string().min(1).max(128);

export const QueryInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'Read-only Oracle SQL SELECT or WITH query to execute. Bound results with FETCH FIRST n ROWS ONLY ' +
          "(e.g. SELECT id, name FROM HR.CUSTOMERS WHERE status = 'active' FETCH FIRST 100 ROWS ONLY); LIMIT and " +
          'TOP do not exist in Oracle. Unquoted names are upper-case. Use FROM DUAL for a SELECT without a table. ' +
          'Do not include a trailing semicolon.'
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

export const ListSchemasInputSchema = lazySchema(() => z.object({}));

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    schema: identifier()
      .optional()
      .describe(
        'Schema (owner) to list tables and views from (e.g. "HR"). Defaults to the schema of the connected user. ' +
          'Use listSchemas to discover names.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: identifier().describe(
      'Name of the table or view to describe (e.g. "EMPLOYEES"). Matched exactly first, then in upper case.'
    ),
    schema: identifier()
      .optional()
      .describe(
        'Schema (owner) containing the table (e.g. "HR"). Defaults to the schema of the connected user.'
      ),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const SearchRowsInputSchema = lazySchema(() =>
  z.object({
    table: identifier().describe('Name of the table to search (e.g. "EMPLOYEES", "PRODUCTS")'),
    searchTerm: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Text to search for using LIKE pattern matching. Matches rows where any of the specified columns contain ' +
          'this text (case-insensitive, partial match).'
      ),
    columns: z
      .array(identifier())
      .min(1)
      .max(50)
      .describe(
        'Column names to search in (e.g. ["LAST_NAME", "EMAIL"]). At least one column is required. Matched exactly ' +
          'first, then in upper case. Use character columns; use describeTable to discover them.'
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
      .describe(
        'Schema (owner) containing the table (e.g. "HR"). Defaults to the schema of the connected user.'
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
        'Oracle SQL or PL/SQL statement to execute. Any statement type is permitted (SELECT, INSERT, UPDATE, DELETE, ' +
          'CREATE, DROP, anonymous PL/SQL blocks, etc.) and it is committed on success. Use with caution — this ' +
          'action is unrestricted.'
      ),
  })
);
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlInputSchema>;
