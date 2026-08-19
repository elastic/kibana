/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

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

const BindingValueSchema = lazySchema(() =>
  z.object({
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
  })
);

// ---------------------------------------------------------------------------
// executeStatement
// ---------------------------------------------------------------------------

export const ExecuteStatementInputSchema = lazySchema(() =>
  z.object({
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
  })
);
export type ExecuteStatementInput = z.infer<typeof ExecuteStatementInputSchema>;

// ---------------------------------------------------------------------------
// runQuery
// ---------------------------------------------------------------------------

export const RunQueryInputSchema = lazySchema(() =>
  z.object({
    statement: z
      .string()
      .min(1)
      .describe(
        'Read-only SQL statement to run. Only SELECT, WITH (CTE), SHOW, DESCRIBE / DESC, and EXPLAIN are accepted. Write operations (INSERT, UPDATE, DELETE, MERGE), DDL (CREATE, ALTER, DROP, TRUNCATE), privilege changes (GRANT, REVOKE), stored procedure calls (CALL), and session state changes (USE, SET) are rejected. Use "?" placeholders for bind variables and provide values via the bindings parameter. Single-statement only — semicolon-delimited multi-statement submissions are rejected.'
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
    queryTag: z
      .string()
      .optional()
      .describe(
        'Tag to associate with the query for tracking and filtering in Snowflake query history.'
      ),
  })
);
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;

// ---------------------------------------------------------------------------
// getStatementStatus
// ---------------------------------------------------------------------------

export const GetStatementStatusInputSchema = lazySchema(() =>
  z.object({
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
  })
);
export type GetStatementStatusInput = z.infer<typeof GetStatementStatusInputSchema>;

// ---------------------------------------------------------------------------
// cancelStatement
// ---------------------------------------------------------------------------

export const CancelStatementInputSchema = lazySchema(() =>
  z.object({
    statementHandle: z
      .string()
      .min(1)
      .describe(
        'The statement handle (UUID) of the running statement to cancel. Obtain this from the executeStatement response.'
      ),
  })
);
export type CancelStatementInput = z.infer<typeof CancelStatementInputSchema>;

// ---------------------------------------------------------------------------
// Snowflake REST API v2 — shared list/paging query params
// https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/reference
// ---------------------------------------------------------------------------

export const ListCommonQueryParamsSchema = lazySchema(() =>
  z.object({
    like: z
      .string()
      .optional()
      .describe(
        'Case-insensitive SQL pattern to filter by object name. Supports "%" (any sequence) and "_" (single char) wildcards. Examples: "CUST%", "%_LOG", "ORDERS". Omit to return all visible objects.'
      ),
    startsWith: z
      .string()
      .optional()
      .describe(
        'Case-sensitive prefix filter on the object name. Unlike like, this does not use wildcards. Example: "PROD_" returns only names starting with exactly "PROD_".'
      ),
    showLimit: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe(
        'Maximum number of rows to return (1–10000). Prefer <=100 to keep LLM context small. When omitted, Snowflake applies a server-side default.'
      ),
    fromName: z
      .string()
      .optional()
      .describe(
        'Cursor for pagination. Returns only rows whose name sorts after this value (case-sensitive, alphabetical). Use the last name from a previous page to fetch the next page.'
      ),
  })
);

// ---------------------------------------------------------------------------
// listDatabases
// ---------------------------------------------------------------------------

export const ListDatabasesInputSchema = lazySchema(() =>
  ListCommonQueryParamsSchema.extend({
    history: z
      .boolean()
      .optional()
      .describe(
        'If true, include dropped databases that have not yet been purged. Defaults to false.'
      ),
  })
);
export type ListDatabasesInput = z.infer<typeof ListDatabasesInputSchema>;

// ---------------------------------------------------------------------------
// listSchemas
// ---------------------------------------------------------------------------

export const ListSchemasInputSchema = lazySchema(() =>
  ListCommonQueryParamsSchema.extend({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name (e.g. "PROD_DB") whose schemas to list. Use listDatabases to discover available databases.'
      ),
  })
);
export type ListSchemasInput = z.infer<typeof ListSchemasInputSchema>;

// ---------------------------------------------------------------------------
// listTables
// ---------------------------------------------------------------------------

export const ListTablesInputSchema = lazySchema(() =>
  ListCommonQueryParamsSchema.extend({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name containing the schema. Use listDatabases to discover available databases.'
      ),
    schema: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive schema name whose tables to list (e.g. "PUBLIC"). Use listSchemas to discover available schemas.'
      ),
    history: z
      .boolean()
      .optional()
      .describe(
        'If true, include dropped tables that have not yet been purged. Defaults to false.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

// ---------------------------------------------------------------------------
// listViews
// ---------------------------------------------------------------------------

export const ListViewsInputSchema = lazySchema(() =>
  ListCommonQueryParamsSchema.extend({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name containing the schema. Use listDatabases to discover available databases.'
      ),
    schema: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive schema name whose views to list (e.g. "PUBLIC"). Use listSchemas to discover available schemas.'
      ),
  })
);
export type ListViewsInput = z.infer<typeof ListViewsInputSchema>;

// ---------------------------------------------------------------------------
// describeTable
// ---------------------------------------------------------------------------

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name containing the table (e.g. "PROD_DB"). Must match the value returned by listDatabases.'
      ),
    schema: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive schema name containing the table (e.g. "PUBLIC"). Must match the value returned by listSchemas.'
      ),
    name: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive table name (e.g. "ORDERS"). Must match the value returned by listTables. Returns columns (name, type, nullable, default, comment), clustering keys, row count, and other metadata.'
      ),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

// ---------------------------------------------------------------------------
// describeView
// ---------------------------------------------------------------------------

export const DescribeViewInputSchema = lazySchema(() =>
  z.object({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name containing the view. Must match the value returned by listDatabases.'
      ),
    schema: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive schema name containing the view. Must match the value returned by listSchemas.'
      ),
    name: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive view name. Must match the value returned by listViews. Returns the view definition, columns, and the underlying query text.'
      ),
  })
);
export type DescribeViewInput = z.infer<typeof DescribeViewInputSchema>;

// ---------------------------------------------------------------------------
// Cortex Search
// https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-search/query-cortex-search-service
// ---------------------------------------------------------------------------

export const ListCortexSearchServicesInputSchema = lazySchema(() =>
  ListCommonQueryParamsSchema.omit({
    startsWith: true,
  }).extend({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name containing the schema. Use listDatabases to discover available databases.'
      ),
    schema: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive schema name whose Cortex Search services to list. Use listSchemas to discover available schemas.'
      ),
  })
);
export type ListCortexSearchServicesInput = z.infer<typeof ListCortexSearchServicesInputSchema>;

export const CortexSearchInputSchema = lazySchema(() =>
  z.object({
    database: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive database name containing the Cortex Search service. Use listDatabases or listCortexSearchServices to discover.'
      ),
    schema: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive schema name containing the Cortex Search service. Use listCortexSearchServices to discover.'
      ),
    serviceName: z
      .string()
      .min(1)
      .describe(
        'Case-sensitive name of the Cortex Search service to query. Use listCortexSearchServices to discover available services.'
      ),
    query: z
      .string()
      .min(1)
      .describe(
        "Natural-language search query to run against the service's indexed search column. Cortex Search performs semantic + lexical matching automatically."
      ),
    columns: z
      .array(z.string())
      .optional()
      .describe(
        "Additional columns to return for each result. Must be included in the service's source query. If omitted, only the indexed search column is returned."
      ),
    filter: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Filter object restricting results by ATTRIBUTES columns. Supported operators: @eq (text/numeric equality), @contains (array membership), @gte/@lte (numeric/date range), @and, @or, @not. Examples: {"@eq": {"REGION": "US"}}; {"@and": [{"@gte": {"LIKES": 50}}, {"@contains": {"TAGS": "ai"}}]}.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Maximum number of results to return (1–1000). Defaults to 10. Prefer <=20 to keep LLM context small.'
      ),
  })
);
export type CortexSearchInput = z.infer<typeof CortexSearchInputSchema>;
