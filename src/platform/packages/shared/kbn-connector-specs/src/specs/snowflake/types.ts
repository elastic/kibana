/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Snowflake SQL API binding types
// https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests
// ---------------------------------------------------------------------------

const SNOWFLAKE_BINDING_TYPES = [
  'FIXED',
  'REAL',
  'DECFLOAT',
  'TEXT',
  'BINARY',
  'BOOLEAN',
  'DATE',
  'TIME',
  'TIMESTAMP_TZ',
  'TIMESTAMP_LTZ',
  'TIMESTAMP_NTZ',
] as const;

const BindingValueSchema = z.object({
  type: z
    .enum(SNOWFLAKE_BINDING_TYPES)
    .describe(
      'Snowflake data type for the bind variable. Common types: TEXT for strings, FIXED for integers, REAL for floats, BOOLEAN for booleans, DATE/TIMESTAMP_* for temporal values.'
    ),
  value: z
    .string()
    .describe(
      'String representation of the value. All values must be strings, e.g. "123" for integer 123, "true" for boolean true.'
    ),
});

// ---------------------------------------------------------------------------
// executeStatement
// ---------------------------------------------------------------------------

export const ExecuteStatementInputSchema = z.object({
  statement: z
    .string()
    .min(1)
    .describe(
      'SQL statement to execute. Supports any Snowflake SQL including SELECT, INSERT, UPDATE, DELETE, CREATE, etc. Use "?" placeholders for bind variables and provide values via the bindings parameter. Multiple statements can be separated by semicolons when multiStatementCount is set.'
    ),
  timeout: z
    .number()
    .int()
    .min(0)
    .max(604800)
    .optional()
    .describe(
      'Timeout in seconds for statement execution (0–604800). 0 sets the maximum timeout (7 days). If omitted, uses the STATEMENT_TIMEOUT_IN_SECONDS session parameter.'
    ),
  database: z
    .string()
    .optional()
    .describe(
      'Database to use for execution. Case-sensitive — must match the value returned by SHOW DATABASES. If omitted, uses the user default (DEFAULT_NAMESPACE).'
    ),
  schema: z
    .string()
    .optional()
    .describe(
      'Schema to use for execution. Case-sensitive. If omitted, uses the user default (DEFAULT_NAMESPACE).'
    ),
  warehouse: z
    .string()
    .optional()
    .describe(
      'Warehouse to use for execution. Case-sensitive. If omitted, uses the user default (DEFAULT_WAREHOUSE).'
    ),
  role: z
    .string()
    .optional()
    .describe(
      'Role to use for execution. Case-sensitive. If omitted, uses the user default (DEFAULT_ROLE).'
    ),
  bindings: z
    .record(z.string(), BindingValueSchema)
    .optional()
    .describe(
      'Bind variable values keyed by 1-based position (e.g. {"1": {"type": "FIXED", "value": "123"}}). Each key corresponds to a "?" placeholder in the SQL statement.'
    ),
  multiStatementCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Number of SQL statements in the request when using multi-statement execution. Set to 0 for a variable number, or the exact count. Required when submitting more than one statement separated by semicolons.'
    ),
  queryTag: z
    .string()
    .optional()
    .describe(
      'Tag to associate with the query for tracking and filtering in Snowflake query history.'
    ),
});
export type ExecuteStatementInput = z.infer<typeof ExecuteStatementInputSchema>;

// ---------------------------------------------------------------------------
// getStatementStatus
// ---------------------------------------------------------------------------

export const GetStatementStatusInputSchema = z.object({
  statementHandle: z
    .string()
    .min(1)
    .describe(
      'The statement handle (UUID) returned by executeStatement. Used to poll for results or check execution progress.'
    ),
  partition: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Partition number to retrieve (0-based). Snowflake splits large result sets into partitions. Omit to get the first partition.'
    ),
});
export type GetStatementStatusInput = z.infer<typeof GetStatementStatusInputSchema>;

// ---------------------------------------------------------------------------
// cancelStatement
// ---------------------------------------------------------------------------

export const CancelStatementInputSchema = z.object({
  statementHandle: z
    .string()
    .min(1)
    .describe(
      'The statement handle (UUID) of the running statement to cancel. Obtain this from the executeStatement response.'
    ),
});
export type CancelStatementInput = z.infer<typeof CancelStatementInputSchema>;
