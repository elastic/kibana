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

const OWNER_DESCRIPTION =
  'Schema (owner) name, exactly as returned by listSchemas, usually uppercase (e.g. "HR"). Uses the schema of the connected user if omitted.';

export const QueryInputSchema = lazySchema(() =>
  z.object({
    sql: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'Read-only Oracle SQL SELECT or WITH query. Oracle has no LIMIT clause: bound results with FETCH FIRST n ROWS ONLY (e.g. SELECT employee_id, last_name FROM hr.employees WHERE department_id = 50 FETCH FIRST 100 ROWS ONLY). Do not include a trailing semicolon.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Maximum number of rows to return (1-1000, default: 100). Rows beyond this are dropped and the result reports truncated: true.'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListSchemasInputSchema = lazySchema(() => z.object({}));

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(128).optional().describe(OWNER_DESCRIPTION),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .min(1)
      .max(128)
      .describe(
        'Name of the table or view to describe, exactly as returned by listTables, usually uppercase (e.g. "EMPLOYEES")'
      ),
    owner: z.string().min(1).max(128).optional().describe(OWNER_DESCRIPTION),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const SearchRowsInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .min(1)
      .max(128)
      .describe('Name of the table or view to search, exactly as returned by listTables'),
    searchTerm: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Text to search for using SQL LIKE pattern matching. Matches rows where any of the specified columns contain this text (case-insensitive, partial match).'
      ),
    columns: z
      .array(z.string().min(1).max(128))
      .min(1)
      .max(50)
      .describe(
        'Column names to search in, exactly as returned by describeTable (e.g. ["LAST_NAME", "EMAIL"]). At least one is required.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of rows to return (1-1000, default: 100)'),
    owner: z.string().min(1).max(128).optional().describe(OWNER_DESCRIPTION),
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
        'Single SQL or PL/SQL statement to execute and commit. Any statement type is permitted (INSERT, UPDATE, DELETE, CREATE, DROP, BEGIN ... END;). Do not include a trailing semicolon after plain SQL. Use with caution: this action is unrestricted.'
      ),
  })
);
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlInputSchema>;
