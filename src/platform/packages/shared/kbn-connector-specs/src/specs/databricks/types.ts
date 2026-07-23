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
// All schemas use lazySchema() — do not use bare z.object().
// All z.string() fields must have .max(N).
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const RunQueryInputSchema = lazySchema(() =>
  z.object({
    statement: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'The read-only SQL query to execute. Only SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, and WITH queries are allowed — ' +
          'INSERT, UPDATE, DELETE, and DDL are blocked. ' +
          'Use SHOW and DESCRIBE to discover available catalogs, schemas, tables, and columns. ' +
          'Example: "SELECT * FROM main.default.customers LIMIT 10" or "SHOW TABLES IN main.default"'
      ),
  })
);
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;

export const ExecuteStatementInputSchema = lazySchema(() =>
  z.object({
    statement: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'The SQL statement to execute. Supports DML (INSERT, UPDATE, DELETE), ' +
          'DDL (CREATE, ALTER, DROP), SHOW, DESCRIBE, and other SQL dialects supported by Databricks SQL. ' +
          'For long-running queries, returns a statement_id — use the pollResponse action to retrieve results. ' +
          'Example: "INSERT INTO main.default.users VALUES (1, \'Alice\')" or "CREATE TABLE main.default.t (id INT)"'
      ),
  })
);
export type ExecuteStatementInput = z.infer<typeof ExecuteStatementInputSchema>;

export const PollResponseInputSchema = lazySchema(() =>
  z.object({
    statementId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The statement ID returned by the runQuery or executeStatement action when a query is still running. ' +
          'Use this to check whether the query has completed and retrieve the result. ' +
          'Example: "01ef1234-5678-abcd-efab-cdef01234567"'
      ),
  })
);
export type PollResponseInput = z.infer<typeof PollResponseInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the Databricks MCP tool to call (use listTools to discover available names). ' +
          'Example: "execute_sql" or "poll_response"'
      ),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe('Arguments to pass to the tool (tool-specific key-value map)'),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
