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

// =============================================================================
// Jobs REST API
// =============================================================================

export const ListRunsInputSchema = lazySchema(() =>
  z.object({
    jobId: z
      .number()
      .optional()
      .describe('Filter to runs from this job ID. Omit to list runs across all jobs.'),
    activeOnly: z
      .boolean()
      .optional()
      .describe('If true, return only active runs (PENDING, RUNNING, TERMINATING).'),
    limit: z
      .number()
      .min(1)
      .max(25)
      .optional()
      .describe('Maximum number of runs to return (default 20, max 25).'),
    pageToken: z
      .string()
      .max(200)
      .optional()
      .describe('Cursor token from a previous listRuns response for pagination.'),
  })
);
export type ListRunsInput = z.infer<typeof ListRunsInputSchema>;

export const GetRunInputSchema = lazySchema(() =>
  z.object({
    runId: z.number().describe('The run ID to retrieve. Example: 455644833'),
  })
);
export type GetRunInput = z.infer<typeof GetRunInputSchema>;

export const GetRunOutputInputSchema = lazySchema(() =>
  z.object({
    runId: z
      .number()
      .describe(
        "A task-level run ID from getRun's tasks[].run_id — NOT the top-level run_id. " +
          'Example: call getRun with the job run_id, then pass tasks[0].run_id here.'
      ),
  })
);
export type GetRunOutputInput = z.infer<typeof GetRunOutputInputSchema>;

export const RunJobNowInputSchema = lazySchema(() =>
  z.object({
    jobId: z.number().describe('The job ID to trigger. Example: 11223344'),
    jobParameters: z
      .record(z.string().max(200), z.string().max(1000))
      .optional()
      .describe(
        'Job parameters to pass as key-value pairs. Overrides defaults defined in the job. ' +
          'Example: { "env": "prod", "date": "2024-01-01" }'
      ),
  })
);
export type RunJobNowInput = z.infer<typeof RunJobNowInputSchema>;

export const CancelRunInputSchema = lazySchema(() =>
  z.object({
    runId: z.number().describe('The run ID to cancel. Example: 455644833'),
  })
);
export type CancelRunInput = z.infer<typeof CancelRunInputSchema>;

export const RepairRunInputSchema = lazySchema(() =>
  z
    .object({
      runId: z.number().describe('The run ID to repair. Example: 455644833'),
      rerunTasks: z
        .array(z.string().max(200))
        .optional()
        .describe(
          'Task keys to re-run. Mutually exclusive with rerunAllFailedTasks. Omit both to re-run all failed tasks.'
        ),
      rerunAllFailedTasks: z
        .boolean()
        .optional()
        .describe('If true, re-run all failed tasks. Mutually exclusive with rerunTasks.'),
      latestRepairId: z
        .number()
        .optional()
        .describe('ID of the most recent repair run. Required when chaining multiple repairs.'),
    })
    .refine((v) => !(v.rerunTasks !== undefined && v.rerunAllFailedTasks !== undefined), {
      message: 'rerunTasks and rerunAllFailedTasks are mutually exclusive',
    })
);
export type RepairRunInput = z.infer<typeof RepairRunInputSchema>;

// =============================================================================
// Clusters REST API
// =============================================================================

export const ListClustersInputSchema = lazySchema(() => z.object({}));
export type ListClustersInput = z.infer<typeof ListClustersInputSchema>;

export const ClusterIdInputSchema = lazySchema(() =>
  z.object({
    clusterId: z
      .string()
      .min(1)
      .max(200)
      .describe('The cluster ID. Example: "0923-164208-meows279"'),
  })
);
export type ClusterIdInput = z.infer<typeof ClusterIdInputSchema>;

// =============================================================================
// Warehouses REST API
// =============================================================================

export const ListWarehousesInputSchema = lazySchema(() => z.object({}));
export type ListWarehousesInput = z.infer<typeof ListWarehousesInputSchema>;

export const WarehouseIdInputSchema = lazySchema(() =>
  z.object({
    warehouseId: z
      .string()
      .min(1)
      .max(200)
      .describe('The SQL warehouse ID. Example: "abc123def456"'),
  })
);
export type WarehouseIdInput = z.infer<typeof WarehouseIdInputSchema>;

// =============================================================================
// Alerts REST API
// =============================================================================

export const ListAlertsInputSchema = lazySchema(() => z.object({}));
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const GetAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: z.string().min(1).max(200).describe('The alert ID. Example: "abc123def456"'),
  })
);
export type GetAlertInput = z.infer<typeof GetAlertInputSchema>;
