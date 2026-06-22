/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const QueryInputSchema = z.object({
  sql: z
    .string()
    .describe(
      'Read-only SQL SELECT query to execute (e.g. SELECT id, name FROM users WHERE status = "active" LIMIT 20). Only SELECT statements are permitted.'
    ),
  maxRows: z.number().optional().describe('Maximum number of rows to return (default: 100)'),
});
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListDatabasesInputSchema = z.object({});
export const ListTablesInputSchema = z.object({
  database: z
    .string()
    .optional()
    .describe(
      'Database name to list tables from. Uses the configured default database if omitted.'
    ),
});
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = z.object({
  table: z.string().describe('Name of the table to describe (e.g. "users", "orders")'),
  database: z
    .string()
    .optional()
    .describe(
      'Database name containing the table. Uses the configured default database if omitted.'
    ),
});
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const SearchRowsInputSchema = z.object({
  table: z.string().describe('Name of the table to search (e.g. "users", "products")'),
  searchTerm: z
    .string()
    .describe(
      'Text to search for using SQL LIKE pattern matching. Matches rows where any of the specified columns contain this text (case-insensitive, partial match).'
    ),
  columns: z
    .array(z.string())
    .min(1)
    .describe(
      'Column names to search in (e.g. ["name", "email", "notes"]). At least one column is required. Use describeTable to discover available columns.'
    ),
  maxRows: z.number().optional().describe('Maximum number of rows to return (default: 100)'),
  database: z
    .string()
    .optional()
    .describe(
      'Database name containing the table. Uses the configured default database if omitted.'
    ),
});
export type SearchRowsInput = z.infer<typeof SearchRowsInputSchema>;
