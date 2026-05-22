/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  ExecuteQueryInput,
  GetQueryResultsInput,
  ListDatasetsInput,
  RunQueryInput,
} from './types';
import {
  ExecuteQueryInputSchema,
  GetQueryResultsInputSchema,
  ListDatasetsInputSchema,
  RunQueryInputSchema,
} from './types';

const BIGQUERY_API_BASE = 'https://bigquery.googleapis.com/bigquery/v2';
const DEFAULT_LOCATION = 'US';
const DEFAULT_MAX_RESULTS = 1000;
const BIGQUERY_USER_AGENT = 'Kibana-BigQuery-Connector/1.0';

const READ_ONLY_QUERY_PREFIXES = /^(SELECT|WITH|EXPLAIN)\b/i;

interface BigQueryJobReference {
  projectId?: string;
  jobId?: string;
  location?: string;
}

interface BigQueryFieldSchema {
  name: string;
  type?: string;
  mode?: string;
  fields?: BigQueryFieldSchema[];
}

interface BigQueryCell {
  v?: BigQueryCellValue;
}

interface BigQueryRecordValue {
  f?: BigQueryCell[];
}

type BigQueryCellValue = string | number | boolean | null | BigQueryRecordValue | BigQueryCell[];

interface BigQueryRow {
  f?: BigQueryCell[];
}

interface BigQueryQueryResponse {
  jobReference?: BigQueryJobReference;
  jobComplete?: boolean;
  schema?: { fields?: BigQueryFieldSchema[] };
  rows?: BigQueryRow[];
  totalRows?: string;
  totalBytesProcessed?: string;
  pageToken?: string;
  cacheHit?: boolean;
  errors?: Array<{ message?: string; reason?: string; location?: string }>;
}

const stripLeadingCommentsAndWhitespace = (sql: string): string => {
  let remaining = sql;
  while (true) {
    const before = remaining;
    remaining = remaining.replace(/^\s+/, '');
    remaining = remaining.replace(/^--[^\n]*(?:\n|$)/, '');
    remaining = remaining.replace(/^\/\*[\s\S]*?\*\//, '');
    if (remaining === before) return remaining;
  }
};

const hasTrailingStatement = (sql: string): boolean => {
  const semicolonIndex = sql.indexOf(';');
  if (semicolonIndex === -1) return false;
  const trailing = stripLeadingCommentsAndWhitespace(sql.slice(semicolonIndex + 1));
  return trailing.length > 0;
};

const isReadOnlyQuery = (sql: string): boolean => {
  if (hasTrailingStatement(sql)) return false;
  const head = stripLeadingCommentsAndWhitespace(sql);
  return READ_ONLY_QUERY_PREFIXES.test(head);
};

const throwBigQueryError = (error: unknown): never => {
  const err = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: { error?: { message?: string; code?: number; status?: string } };
    };
    message?: string;
  };

  const apiError = err.response?.data?.error;
  if (apiError) {
    throw new Error(
      `BigQuery API error [${apiError.status || apiError.code}]: ${apiError.message}`
    );
  }

  const status = err.response?.status;
  const statusText = err.response?.statusText;
  const message = err.message || 'Unknown error';
  if (status === 401) {
    throw new Error(`BigQuery authentication failed (401): ${message}`);
  }
  if (status === 403) {
    throw new Error(`BigQuery access denied (403): ${message}`);
  }
  throw new Error(`BigQuery API request failed: ${statusText || message}`);
};

const getConfig = (
  ctx: ActionContext
): { projectId: string; location: string; maximumBytesBilled?: string } => {
  const config = ctx.config as {
    projectId: string;
    location?: string;
    maximumBytesBilled?: string;
  };
  return {
    projectId: config.projectId,
    location: config.location || DEFAULT_LOCATION,
    maximumBytesBilled: config.maximumBytesBilled,
  };
};

const convertCellValue = (
  field: BigQueryFieldSchema | undefined,
  value: BigQueryCellValue | undefined
): BigQueryCellValue | Record<string, BigQueryCellValue> => {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    return value.map((item) => convertCellValue(field, item.v)) as BigQueryCell[];
  }

  if (typeof value === 'object' && 'f' in value) {
    return convertRow(field?.fields || [], { f: value.f });
  }

  return value;
};

const convertRow = (
  fields: BigQueryFieldSchema[],
  row: BigQueryRow
): Record<string, BigQueryCellValue> => {
  const cells = row.f || [];
  return fields.reduce<Record<string, BigQueryCellValue>>((acc, field, index) => {
    acc[field.name] = convertCellValue(field, cells[index]?.v) as BigQueryCellValue;
    return acc;
  }, {});
};

const normalizeQueryResponse = (response: BigQueryQueryResponse) => {
  const fields = response.schema?.fields || [];
  return {
    jobComplete: response.jobComplete ?? false,
    jobReference: response.jobReference,
    totalRows: response.totalRows,
    totalBytesProcessed: response.totalBytesProcessed,
    pageToken: response.pageToken,
    cacheHit: response.cacheHit,
    errors: response.errors,
    schema: fields,
    rows: (response.rows || []).map((row) => convertRow(fields, row)),
    rawRows: response.rows || [],
  };
};

const submitQuery = async (
  ctx: ActionContext,
  input: ExecuteQueryInput | RunQueryInput
): Promise<ReturnType<typeof normalizeQueryResponse>> => {
  const { projectId, location: defaultLocation, maximumBytesBilled } = getConfig(ctx);
  const location = input.location || defaultLocation;

  const body: Record<string, string | number | boolean> = {
    query: input.query,
    useLegacySql: false,
    location,
    maxResults: input.maxResults ?? DEFAULT_MAX_RESULTS,
  };
  if (input.timeoutMs !== undefined) body.timeoutMs = input.timeoutMs;
  if (input.useQueryCache !== undefined) body.useQueryCache = input.useQueryCache;
  if ('dryRun' in input && input.dryRun !== undefined) body.dryRun = input.dryRun;
  if (maximumBytesBilled !== undefined) body.maximumBytesBilled = maximumBytesBilled;

  try {
    const response = await ctx.client.post<BigQueryQueryResponse>(
      `${BIGQUERY_API_BASE}/projects/${encodeURIComponent(projectId)}/queries`,
      body
    );
    return normalizeQueryResponse(response.data);
  } catch (error) {
    return throwBigQueryError(error);
  }
};

export const BigQuery: ConnectorSpec = {
  metadata: {
    id: '.bigquery',
    displayName: 'BigQuery',
    description: i18n.translate('core.kibanaConnectorSpecs.bigQuery.metadata.description', {
      defaultMessage: 'Run GoogleSQL queries and retrieve results from Google BigQuery',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['gcp_service_account'],
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': BIGQUERY_USER_AGENT,
    },
  },

  schema: lazySchema(() =>
    z.object({
      projectId: z
        .string()
        .min(1)
        .describe('Default Google Cloud project ID for BigQuery jobs, such as "elastic-edm-prod".')
        .meta({
          widget: 'text',
          placeholder: 'elastic-edm-prod',
          label: i18n.translate('core.kibanaConnectorSpecs.bigQuery.config.projectId.label', {
            defaultMessage: 'Project ID',
          }),
        }),
      location: z
        .string()
        .optional()
        .default(DEFAULT_LOCATION)
        .describe(
          'Default BigQuery processing location, such as "US", "EU", "us-central1", or "europe-west1".'
        )
        .meta({
          widget: 'text',
          placeholder: DEFAULT_LOCATION,
          label: i18n.translate('core.kibanaConnectorSpecs.bigQuery.config.location.label', {
            defaultMessage: 'Default location',
          }),
        }),
      maximumBytesBilled: z
        .string()
        .optional()
        .describe(
          'Optional maximum bytes billed for each query, as an integer string. BigQuery rejects queries that exceed this limit.'
        )
        .meta({
          widget: 'text',
          placeholder: '10000000000',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.bigQuery.config.maximumBytesBilled.label',
            {
              defaultMessage: 'Maximum bytes billed',
            }
          ),
        }),
    })
  ),

  actions: {
    runQuery: {
      isTool: true,
      description:
        'Run a read-only GoogleSQL query in BigQuery. Accepts SELECT, WITH (CTE), and EXPLAIN statements only; rejects DML, DDL, scripts, stored procedures, and semicolon-delimited multi-statement submissions before the request is sent. Returns normalized rows as objects plus the BigQuery job reference and pagination token when more rows are available.',
      input: RunQueryInputSchema,
      handler: async (ctx, input: RunQueryInput) => {
        if (!isReadOnlyQuery(input.query)) {
          throw new Error(
            'runQuery only accepts read-only BigQuery GoogleSQL statements (SELECT, WITH, EXPLAIN) and rejects semicolon-delimited multi-statement submissions. Use executeQuery from a workflow for non-read-only statements.'
          );
        }
        return submitQuery(ctx, input);
      },
    },

    executeQuery: {
      isTool: false,
      description:
        'Run any GoogleSQL query in BigQuery from a workflow or direct connector execution. This action is intentionally hidden from agents because it can run DML, DDL, scripts, stored procedures, or expensive queries. Returns normalized rows as objects plus the BigQuery job reference and pagination token when more rows are available.',
      input: ExecuteQueryInputSchema,
      handler: async (ctx, input: ExecuteQueryInput) => submitQuery(ctx, input),
    },

    getQueryResults: {
      isTool: true,
      description:
        'Poll or page through results for a BigQuery job returned by runQuery. Use this when runQuery returns jobComplete=false or a pageToken. Returns normalized rows as objects plus raw row arrays, schema, job status, and the next page token when available.',
      input: GetQueryResultsInputSchema,
      handler: async (ctx, input: GetQueryResultsInput) => {
        const { projectId: defaultProjectId, location: defaultLocation } = getConfig(ctx);
        const projectId = input.projectId || defaultProjectId;
        const params: Record<string, string | number> = {};
        const location = input.location || defaultLocation;
        if (location) params.location = location;
        if (input.maxResults !== undefined) params.maxResults = input.maxResults;
        if (input.pageToken) params.pageToken = input.pageToken;
        if (input.timeoutMs !== undefined) params.timeoutMs = input.timeoutMs;

        try {
          const response = await ctx.client.get<BigQueryQueryResponse>(
            `${BIGQUERY_API_BASE}/projects/${encodeURIComponent(
              projectId
            )}/queries/${encodeURIComponent(input.jobId)}`,
            { params }
          );
          return normalizeQueryResponse(response.data);
        } catch (error) {
          throwBigQueryError(error);
        }
      },
    },

    listDatasets: {
      isTool: true,
      description:
        'List BigQuery datasets visible to the configured service account in a project. Use this for discovery before writing fully-qualified table references. Returns BigQuery dataset metadata and pagination tokens.',
      input: ListDatasetsInputSchema,
      handler: async (ctx, input: ListDatasetsInput) => {
        const { projectId: defaultProjectId } = getConfig(ctx);
        const projectId = input.projectId || defaultProjectId;
        const params: Record<string, string | number> = {};
        if (input.maxResults !== undefined) params.maxResults = input.maxResults;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${BIGQUERY_API_BASE}/projects/${encodeURIComponent(projectId)}/datasets`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwBigQueryError(error);
        }
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.bigQuery.test.description', {
      defaultMessage:
        'Verifies BigQuery API access by running a lightweight SELECT 1 query in the configured project.',
    }),
    handler: async (ctx) => {
      try {
        const result = await submitQuery(ctx, {
          query: 'SELECT 1 AS ok',
          maxResults: 1,
        });
        return {
          ok: true,
          message: `Successfully connected to BigQuery${
            result.jobReference?.jobId ? ` (job ${result.jobReference.jobId})` : ''
          }`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          message: `Failed to connect to BigQuery: ${errorMessage}`,
        };
      }
    },
  },

  skill: [
    '## BigQuery Connector',
    '',
    'Use this connector to run GoogleSQL queries against BigQuery using a GCP service account.',
    '',
    '### Auth',
    'This connector uses the shared `gcp_service_account` auth type. Provide a service account JSON key with BigQuery permissions for the target project and datasets.',
    '',
    '### Query pattern',
    '1. Use `runQuery` for read-only SELECT / WITH / EXPLAIN queries. It returns `rows` as objects, `schema`, `jobReference`, and pagination metadata.',
    '2. If `jobComplete` is false, or if `pageToken` is present, call `getQueryResults` with the returned `jobReference.jobId`, `jobReference.location`, and `pageToken`.',
    '3. Use fully-qualified table names like `elastic-edm-prod.pa__rpt.rpt__cloud__billing_usage` to avoid ambiguity.',
    '',
    '### Guardrails',
    '- Agents only have `runQuery`, `getQueryResults`, and `listDatasets`. Non-read-only SQL is available only through `executeQuery` in workflows or direct connector execution.',
    '- Prefer explicit date ranges, partition filters, and LIMIT clauses to control cost and result size.',
    '- The connector returns BigQuery numeric values as BigQuery returns them, usually strings for NUMERIC / INT64 fields.',
    '',
    '### Workflows billing digest usage',
    'For billing digests, run deterministic SQL for totals, top accounts, projections, and attribution, then pass the compact result objects to an Agent Builder summarization step before posting to Slack.',
  ].join('\n'),
};
