/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const DEFAULT_MAX_RESULTS = 1000;
const MAX_RESULTS_LIMIT = 10000;
const MAX_TIMEOUT_MS = 300000;
const MAX_UNRESOLVED_QUERY_BYTES = 1024 * 1024;
const MAX_UNRESOLVED_QUERY_MB = MAX_UNRESOLVED_QUERY_BYTES / (1024 * 1024);
const MAX_LOCATION_LENGTH = 64;
const MAX_PROJECT_ID_LENGTH = 200;
const MAX_JOB_ID_LENGTH = 1024;
const MAX_PAGE_TOKEN_LENGTH = 2048;

const QuerySchema = z
  .string()
  .min(1)
  .max(MAX_UNRESOLVED_QUERY_BYTES)
  .refine((query) => Buffer.byteLength(query, 'utf8') <= MAX_UNRESOLVED_QUERY_BYTES, {
    message: `Query must not exceed BigQuery's ${MAX_UNRESOLVED_QUERY_BYTES} byte (${MAX_UNRESOLVED_QUERY_MB} MB) unresolved query length limit`,
  })
  .describe(
    `GoogleSQL query text to execute in BigQuery (up to ${MAX_UNRESOLVED_QUERY_MB} MB). Use fully-qualified table names such as \`project.dataset.table\`. Prefer explicit date filters and LIMIT clauses for predictable cost and result size.`
  );

const CommonQueryInputSchema = lazySchema(() =>
  z.object({
    query: QuerySchema,
    location: z
      .string()
      .max(MAX_LOCATION_LENGTH)
      .optional()
      .describe(
        'BigQuery processing location, such as "US", "EU", "us-central1", or "europe-west1". If omitted, uses the connector default location.'
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .describe(
        `Maximum number of rows to return in the first response (1-${MAX_RESULTS_LIMIT}). Defaults to ${DEFAULT_MAX_RESULTS}. Use getQueryResults with the returned pageToken for additional pages.`
      ),
    timeoutMs: z
      .number()
      .int()
      .min(0)
      .max(MAX_TIMEOUT_MS)
      .optional()
      .describe(
        `How long BigQuery should wait for query completion before returning a job reference, in milliseconds (0-${MAX_TIMEOUT_MS}). Defaults to BigQuery's server behavior.`
      ),
    useQueryCache: z
      .boolean()
      .optional()
      .describe(
        'Whether BigQuery can use cached query results. Defaults to BigQuery server behavior.'
      ),
  })
);

export const RunQueryInputSchema = lazySchema(() =>
  CommonQueryInputSchema.extend({
    query: QuerySchema.describe(
      'Read-only GoogleSQL query to execute. Only SELECT, WITH (CTE), and EXPLAIN statements are accepted. DML, DDL, scripts, stored procedures, and semicolon-delimited multi-statement submissions are rejected before the request is sent.'
    ),
  })
);
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;

export const ExecuteQueryInputSchema = lazySchema(() =>
  CommonQueryInputSchema.extend({
    dryRun: z
      .boolean()
      .optional()
      .describe(
        'If true, BigQuery validates the query and returns estimated bytes processed without running it.'
      ),
  })
);
export type ExecuteQueryInput = z.infer<typeof ExecuteQueryInputSchema>;

export const GetQueryResultsInputSchema = lazySchema(() =>
  z.object({
    jobId: z
      .string()
      .min(1)
      .max(MAX_JOB_ID_LENGTH)
      .describe('BigQuery job ID returned from runQuery or executeQuery.'),
    projectId: z
      .string()
      .max(MAX_PROJECT_ID_LENGTH)
      .optional()
      .describe('Project ID that owns the BigQuery job. If omitted, uses the connector projectId.'),
    location: z
      .string()
      .max(MAX_LOCATION_LENGTH)
      .optional()
      .describe(
        'BigQuery job location, such as "US", "EU", "us-central1", or "europe-west1". Use the location returned in jobReference when present.'
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .describe(`Maximum number of result rows to return (1-${MAX_RESULTS_LIMIT}).`),
    pageToken: z
      .string()
      .max(MAX_PAGE_TOKEN_LENGTH)
      .optional()
      .describe('Pagination token returned by a previous BigQuery response.'),
    timeoutMs: z
      .number()
      .int()
      .min(0)
      .max(MAX_TIMEOUT_MS)
      .optional()
      .describe('How long BigQuery should wait for query results before returning job status.'),
  })
);
export type GetQueryResultsInput = z.infer<typeof GetQueryResultsInputSchema>;

export const ListDatasetsInputSchema = lazySchema(() =>
  z.object({
    projectId: z
      .string()
      .max(MAX_PROJECT_ID_LENGTH)
      .optional()
      .describe('Project ID whose datasets to list. If omitted, uses the connector projectId.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Maximum number of datasets to return (1-1000). Defaults to BigQuery server behavior.'
      ),
    pageToken: z
      .string()
      .max(MAX_PAGE_TOKEN_LENGTH)
      .optional()
      .describe('Pagination token returned by a previous listDatasets response.'),
  })
);
export type ListDatasetsInput = z.infer<typeof ListDatasetsInputSchema>;
