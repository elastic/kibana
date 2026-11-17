/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// PostgreSQL identifiers are limited to 63 bytes (NAMEDATALEN - 1) and longer ones are silently
// truncated, which could resolve to a different object. `.max()` counts characters, so the byte
// length is checked as well.
export const IDENTIFIER_MAX_BYTES = 63;

export const identifierSchema = () =>
  z
    .string()
    .min(1)
    .max(IDENTIFIER_MAX_BYTES)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= IDENTIFIER_MAX_BYTES, {
      message: `Identifiers are limited to ${IDENTIFIER_MAX_BYTES} bytes`,
    });

const SchemaNameSchema = lazySchema(() =>
  identifierSchema()
    .optional()
    .describe(
      'Schema containing the table (e.g. "public", "sales"). Defaults to "public" if omitted. A PostgreSQL connection is bound to one database, so use listSchemas to see what else is reachable.'
    )
);

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
        "Read-only SQL SELECT or WITH query to execute. Include a LIMIT clause to bound results (e.g. SELECT id, name FROM public.users WHERE status = 'active' LIMIT 100). Use double quotes for mixed-case identifiers. Do not include a trailing semicolon."
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListSchemasInputSchema = lazySchema(() => z.object({}));

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    schema: SchemaNameSchema,
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: identifierSchema().describe(
      'Name of the table, view, or materialized view to describe (e.g. "users", "orders"). Case-sensitive: use the exact casing returned by listTables.'
    ),
    schema: SchemaNameSchema,
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const SearchRowsInputSchema = lazySchema(() =>
  z.object({
    table: identifierSchema().describe(
      'Name of the table to search (e.g. "users", "products"). Case-sensitive.'
    ),
    searchTerm: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Text to search for. Matches rows where any of the specified columns contain this text (case-insensitive, partial match). LIKE wildcards (% and _) in the term are matched literally.'
      ),
    columns: z
      .array(identifierSchema())
      .min(1)
      .max(50)
      .describe(
        'Column names to search in (e.g. ["name", "email", "notes"]). At least one column is required. Non-text columns are compared as text. Use describeTable to discover available columns.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of rows to return (1-1000, default: 100)'),
    schema: SchemaNameSchema,
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
