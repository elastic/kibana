/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Databricks MCP Connector
 *
 * An MCP-native connector that connects to the Databricks managed SQL MCP server
 * at https://<workspace>/api/2.0/mcp/sql.
 *
 * Databricks managed MCP servers expose SQL execution and async query polling
 * capabilities via the MCP protocol. The server URL is workspace-specific —
 * each Databricks workspace has its own endpoint.
 *
 * Auth: OAuth 2.0 Authorization Code flow (workspace-level OIDC) or
 *       Bearer token (Databricks Personal Access Token / PAT)
 *
 * MCP server docs: https://docs.databricks.com/aws/en/generative-ai/mcp/managed-mcp
 * OAuth docs: https://docs.databricks.com/aws/en/dev-tools/auth/oauth-u2m
 *
 * The managed SQL MCP server exposes three tools:
 *   execute_sql_read_only  — read-only (SELECT/SHOW/DESCRIBE/EXPLAIN/WITH).
 *                            Server enforces read-only;
 *   execute_sql            — unrestricted (DML, DDL, etc.). No read-only guard.
 *   poll_sql_result        — poll async results by statement_id.
 *
 * Note: the MCP server uses `query` as the parameter name for the SQL (not `statement`).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  CallToolInput,
  CancelRunInput,
  ClusterIdInput,
  ExecuteStatementInput,
  GetAlertInput,
  GetRunInput,
  GetRunOutputInput,
  ListRunsInput,
  PollResponseInput,
  RepairRunInput,
  RunJobNowInput,
  RunQueryInput,
  WarehouseIdInput,
} from './types';
import {
  CallToolInputSchema,
  CancelRunInputSchema,
  ClusterIdInputSchema,
  ExecuteStatementInputSchema,
  GetAlertInputSchema,
  GetRunInputSchema,
  GetRunOutputInputSchema,
  ListAlertsInputSchema,
  ListClustersInputSchema,
  ListRunsInputSchema,
  ListToolsInputSchema,
  ListWarehousesInputSchema,
  PollResponseInputSchema,
  RepairRunInputSchema,
  RunJobNowInputSchema,
  RunQueryInputSchema,
  WarehouseIdInputSchema,
} from './types';

const workspaceOrigin = (ctx: { config?: Record<string, unknown> }): string =>
  new URL(ctx.config?.serverUrl as string).origin;

export const Databricks: ConnectorSpec = {
  metadata: {
    id: '.databricks',
    displayName: 'Databricks',
    description: i18n.translate('core.kibanaConnectorSpecs.databricks.metadata.description', {
      defaultMessage:
        'Execute SQL queries, manage jobs, clusters, and warehouses, and monitor alerts in Databricks',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          scope: 'all-apis offline_access',
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://{workspace}.azuredatabricks.net/oidc/v1/authorize',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.databricks.auth.oauth.authorizationUrl.helpText',
                {
                  defaultMessage:
                    "Databricks workspace OAuth authorization URL. Replace '{workspace}' with your Databricks workspace hostname (e.g. adb-1234567890123456.7).",
                }
              ),
            },
            tokenUrl: {
              placeholder: 'https://{workspace}.azuredatabricks.net/oidc/v1/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.databricks.auth.oauth.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Databricks workspace OAuth token endpoint. Replace '{workspace}' with your Databricks workspace hostname.",
                }
              ),
            },
            scope: {
              hidden: true,
            },
          },
        },
      },
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.databricks.auth.bearer.label', {
            defaultMessage: 'Personal access token (PAT)',
          }),
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.databricks.auth.pat.label', {
                defaultMessage: 'Databricks access token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.databricks.auth.pat.helpText', {
                defaultMessage:
                  'A Databricks personal access token (PAT). Generate one in the Databricks workspace under User Settings → Developer → Access tokens.',
              }),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .describe('Databricks SQL MCP server URL')
        .meta({
          widget: 'text',
          placeholder: 'https://{workspace}.azuredatabricks.net/api/2.0/mcp/sql',
          label: i18n.translate('core.kibanaConnectorSpecs.databricks.config.serverUrl.label', {
            defaultMessage: 'MCP server URL',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.databricks.config.serverUrl.helpText',
            {
              defaultMessage:
                "The Databricks SQL MCP server URL for your workspace. Replace '{workspace}' with your workspace hostname. ",
            }
          ),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    // ── Read-only SQL queries (exposed to AI agents) ──────────────────────────
    runQuery: {
      isTool: true,
      description:
        'Execute a read-only SQL query against the Databricks SQL warehouse. ' +
        'Only SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, and WITH statements are permitted. ' +
        'For long-running queries, returns a statement_id — use the pollResponse action to retrieve results. ' +
        'Use SHOW CATALOGS / SHOW SCHEMAS / SHOW TABLES / DESCRIBE TABLE to discover available data before querying.',
      input: RunQueryInputSchema,
      handler: async (ctx, input: RunQueryInput) => {
        return callToolJson(ctx, 'execute_sql_read_only', { query: input.statement });
      },
    },

    // ── Unrestricted SQL execution (workflow-only, not exposed to AI agents) ──
    executeStatement: {
      isTool: false,
      description:
        'Execute a SQL statement on the Databricks SQL warehouse. Supports DML (INSERT, UPDATE, DELETE), ' +
        'DDL (CREATE, ALTER, DROP), SHOW, DESCRIBE, and other SQL dialects supported by Databricks SQL. ' +
        'For long-running queries, returns a statement_id — use the pollResponse action to retrieve results.',
      input: ExecuteStatementInputSchema,
      handler: async (ctx, input: ExecuteStatementInput) => {
        return callToolJson(ctx, 'execute_sql', { query: input.statement });
      },
    },

    // ── Async result polling ──────────────────────────────────────────────────
    pollResponse: {
      isTool: true,
      description:
        'Poll the status and retrieve results for a previously submitted SQL query. ' +
        'Use this when runQuery or executeStatement returns a statement_id instead of immediate results — ' +
        'that indicates the query is still running. ' +
        'Returns the query status (RUNNING, SUCCEEDED, FAILED, CANCELLED) and, when complete, the result set. ' +
        'Poll repeatedly until the status is SUCCEEDED or FAILED.',
      input: PollResponseInputSchema,
      handler: async (ctx, input: PollResponseInput) => {
        return callToolJson(ctx, 'poll_sql_result', {
          statement_id: input.statementId,
        });
      },
    },

    // ── Escape hatches ────────────────────────────────────────────────────────
    listTools: {
      isTool: false,
      description:
        'List all tools available on the Databricks MCP server. Use this to discover server capabilities ' +
        'and verify exact tool names before using callTool.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: false,
      description:
        'Call any tool on the Databricks MCP server directly by name. Workflow-only. Use this as an escape hatch for tools ' +
        'not yet exposed as named actions. Use listTools first to discover available tool names and their arguments.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },

    // ── Jobs REST API ─────────────────────────────────────────────────────────
    listRuns: {
      isTool: true,
      description:
        'List job runs in the Databricks workspace. Optionally filter by job ID, active-only, or page size. ' +
        'Returns run metadata including run_id, job_id, state, start_time, and task results. ' +
        'Use getRun for full details on a specific run.',
      input: ListRunsInputSchema,
      handler: async (ctx, input: ListRunsInput) => {
        const params: Record<string, unknown> = {};
        if (input.jobId !== undefined) params.job_id = input.jobId;
        if (input.activeOnly !== undefined) params.active_only = input.activeOnly;
        if (input.limit !== undefined) params.limit = input.limit;
        if (input.pageToken !== undefined) params.page_token = input.pageToken;
        const { data } = await ctx.client.get(`${workspaceOrigin(ctx)}/api/2.1/jobs/runs/list`, {
          params,
        });
        return data;
      },
    },

    getRun: {
      isTool: true,
      description:
        'Get details for a specific job run by run ID. Returns the full run object including state, ' +
        'tasks, start/end times, and error messages. Use this to check run status or retrieve task details.',
      input: GetRunInputSchema,
      handler: async (ctx, input: GetRunInput) => {
        const { data } = await ctx.client.get(`${workspaceOrigin(ctx)}/api/2.1/jobs/runs/get`, {
          params: { run_id: input.runId },
        });
        return data;
      },
    },

    getRunOutput: {
      isTool: true,
      description:
        'Retrieve the output of a completed task run (notebook output, logs, return values). ' +
        "Requires a task-level run ID from getRun's tasks[].run_id. " +
        'Call getRun first, then pass one of the task run IDs from the tasks array.',
      input: GetRunOutputInputSchema,
      handler: async (ctx, input: GetRunOutputInput) => {
        const { data } = await ctx.client.get(
          `${workspaceOrigin(ctx)}/api/2.1/jobs/runs/get-output`,
          { params: { run_id: input.runId } }
        );
        return data;
      },
    },

    runJobNow: {
      isTool: false,
      description:
        'Trigger a Databricks job run immediately. Optionally override job parameters. ' +
        'Returns a run_id — use getRun or listRuns to track progress.',
      input: RunJobNowInputSchema,
      handler: async (ctx, input: RunJobNowInput) => {
        const body: Record<string, unknown> = { job_id: input.jobId };
        if (input.jobParameters !== undefined) body.job_parameters = input.jobParameters;
        const { data } = await ctx.client.post(
          `${workspaceOrigin(ctx)}/api/2.1/jobs/run-now`,
          body
        );
        return data;
      },
    },

    cancelRun: {
      isTool: false,
      description:
        'Cancel an active Databricks job run. The run must be in PENDING or RUNNING state. ' +
        'Cancellation is asynchronous — poll getRun until state is CANCELLED.',
      input: CancelRunInputSchema,
      handler: async (ctx, input: CancelRunInput) => {
        const { data } = await ctx.client.post(`${workspaceOrigin(ctx)}/api/2.1/jobs/runs/cancel`, {
          run_id: input.runId,
        });
        return data;
      },
    },

    repairRun: {
      isTool: false,
      description:
        'Re-run failed tasks in a completed job run without re-running tasks that succeeded. ' +
        'Specify exactly one: rerunTasks (one or more task keys) to target specific tasks, or rerunAllFailedTasks: true to retry everything that failed. ' +
        'Returns a repair_id — use getRun to track the repaired run.',
      input: RepairRunInputSchema,
      handler: async (ctx, input: RepairRunInput) => {
        const body: Record<string, unknown> = { run_id: input.runId };
        if (input.rerunTasks !== undefined) {
          body.rerun_tasks = input.rerunTasks;
        } else {
          body.rerun_all_failed_tasks = true;
        }
        if (input.latestRepairId !== undefined) body.latest_repair_id = input.latestRepairId;
        const { data } = await ctx.client.post(
          `${workspaceOrigin(ctx)}/api/2.1/jobs/runs/repair`,
          body
        );
        return data;
      },
    },

    // ── Clusters REST API ─────────────────────────────────────────────────────
    listClusters: {
      isTool: true,
      description:
        'List all clusters in the Databricks workspace. Returns cluster metadata including cluster_id, ' +
        'cluster_name, state (RUNNING, TERMINATED, PENDING, etc.), spark_version, and node type. ' +
        'Use this to discover available clusters before starting or restarting one.',
      input: ListClustersInputSchema,
      handler: async (ctx) => {
        const { data } = await ctx.client.get(`${workspaceOrigin(ctx)}/api/2.0/clusters/list`);
        return data;
      },
    },

    startCluster: {
      isTool: false,
      description:
        'Start a terminated Databricks cluster. The cluster must be in TERMINATED state. ' +
        'Startup is asynchronous — use listClusters to poll until state is RUNNING.',
      input: ClusterIdInputSchema,
      handler: async (ctx, input: ClusterIdInput) => {
        const { data } = await ctx.client.post(`${workspaceOrigin(ctx)}/api/2.0/clusters/start`, {
          cluster_id: input.clusterId,
        });
        return data;
      },
    },

    restartCluster: {
      isTool: false,
      description:
        'Restart a running Databricks cluster. The cluster must be in RUNNING state. ' +
        'Restart is asynchronous — use listClusters to poll until state returns to RUNNING.',
      input: ClusterIdInputSchema,
      handler: async (ctx, input: ClusterIdInput) => {
        const { data } = await ctx.client.post(`${workspaceOrigin(ctx)}/api/2.0/clusters/restart`, {
          cluster_id: input.clusterId,
        });
        return data;
      },
    },

    // ── Warehouses REST API ───────────────────────────────────────────────────
    listWarehouses: {
      isTool: true,
      description:
        'List all SQL warehouses in the Databricks workspace. Returns warehouse metadata including id, ' +
        'name, state (RUNNING, STOPPED, STARTING, etc.), cluster_size, and auto_stop_mins. ' +
        'Use this to find the warehouse ID before starting or stopping one.',
      input: ListWarehousesInputSchema,
      handler: async (ctx) => {
        const { data } = await ctx.client.get(`${workspaceOrigin(ctx)}/api/2.0/sql/warehouses`);
        return data;
      },
    },

    startWarehouse: {
      isTool: false,
      description:
        'Start a stopped SQL warehouse. Startup is asynchronous — use listWarehouses to poll ' +
        'until state is RUNNING before submitting queries.',
      input: WarehouseIdInputSchema,
      handler: async (ctx, input: WarehouseIdInput) => {
        const { data } = await ctx.client.post(
          `${workspaceOrigin(ctx)}/api/2.0/sql/warehouses/${encodeURIComponent(
            input.warehouseId
          )}/start`
        );
        return data;
      },
    },

    stopWarehouse: {
      isTool: false,
      description:
        'Stop a running SQL warehouse. Use this to save costs when the warehouse is no longer needed. ' +
        'Stop is asynchronous — use listWarehouses to confirm state transitions to STOPPED.',
      input: WarehouseIdInputSchema,
      handler: async (ctx, input: WarehouseIdInput) => {
        const { data } = await ctx.client.post(
          `${workspaceOrigin(ctx)}/api/2.0/sql/warehouses/${encodeURIComponent(
            input.warehouseId
          )}/stop`
        );
        return data;
      },
    },

    // ── Alerts REST API ───────────────────────────────────────────────────────
    listAlerts: {
      isTool: true,
      description:
        'List all SQL alerts in the Databricks workspace. Returns alert metadata including id, name, ' +
        'state (OK, TRIGGERED, UNKNOWN), query_id, and condition. ' +
        'Use getAlert for full details on a specific alert.',
      input: ListAlertsInputSchema,
      handler: async (ctx) => {
        const { data } = await ctx.client.get(`${workspaceOrigin(ctx)}/api/2.0/sql/alerts`);
        return data;
      },
    },

    getAlert: {
      isTool: true,
      description:
        'Get details for a specific SQL alert by ID. Returns the full alert definition including ' +
        'the associated query, condition (op, value, empty_result_state), notification schedule, ' +
        'and current state.',
      input: GetAlertInputSchema,
      handler: async (ctx, input: GetAlertInput) => {
        const { data } = await ctx.client.get(
          `${workspaceOrigin(ctx)}/api/2.0/sql/alerts/${encodeURIComponent(input.alertId)}`
        );
        return data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.databricks.test.description', {
      defaultMessage:
        'Verifies connection to the Databricks MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          message: `Connected to Databricks MCP server. ${tools.length} tools available.`,
        };
      });
    },
    enabled: true,
  },

  skill: [
    '## Databricks Connector — usage guidance',
    '',
    '### Choosing between `runQuery` and `executeStatement`',
    '- Use `runQuery` for read-only SQL: SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH queries.',
    '- Use `executeStatement` for DML (INSERT, UPDATE, DELETE) or DDL (CREATE, ALTER, DROP) — workflow-only, not exposed to AI agents.',
    '- Prefer `runQuery` for all data exploration and analytics — it prevents accidental mutations.',
    '',
    '### SQL async polling pattern',
    '1. Call `runQuery` or `executeStatement` with your SQL statement.',
    '2. If the response contains a `statement_id`, the query is still running.',
    '3. Call `pollResponse` with the `statement_id` until the status is "SUCCEEDED" or "FAILED".',
    '4. Once SUCCEEDED, the response contains the result set.',
    '',
    '### Data discovery',
    'Use `runQuery` with SQL statements to explore the data catalog before querying:',
    '- `SHOW CATALOGS` — list all Unity Catalog catalogs',
    '- `SHOW SCHEMAS IN <catalog>` — list schemas (databases) within a catalog',
    '- `SHOW TABLES IN <catalog>.<schema>` — list tables in a schema',
    '- `DESCRIBE TABLE <catalog>.<schema>.<table>` — show column definitions for a table',
    '',
    '### Writing efficient queries',
    'Always qualify table names with catalog.schema.table (e.g., `main.default.customers`) to avoid ambiguity.',
    'Use LIMIT to control result size — Databricks returns large result sets as paginated chunks.',
    '',
    '### Jobs',
    '- Use `listRuns` to find recent runs; filter by `jobId` or `activeOnly` to narrow results.',
    '- Use `getRun` to check run status and retrieve task-level details.',
    "- Use `getRunOutput` with a task-level run ID from `getRun`'s `tasks[].run_id` — NOT the top-level `run_id` from `runJobNow`.",
    '- `runJobNow`, `cancelRun`, and `repairRun` are workflow-only (not exposed to agents).',
    '',
    '### Clusters',
    '- Use `listClusters` to discover available clusters and their current state.',
    '- `startCluster` and `restartCluster` are async — poll `listClusters` until state is RUNNING.',
    '- These actions are workflow-only and not exposed to agents.',
    '',
    '### Warehouses',
    '- Use `listWarehouses` to find warehouse IDs and check whether they are RUNNING or STOPPED.',
    '- `startWarehouse` / `stopWarehouse` are async and workflow-only.',
    '- If SQL queries fail with a warehouse unavailable error, the warehouse likely needs to be started.',
    '',
    '### Alerts',
    '- Use `listAlerts` to see all SQL alerts and their current state (OK, TRIGGERED, UNKNOWN).',
    '- Use `getAlert` to retrieve the full condition, query, and notification config for a specific alert.',
    '',
    '### MCP escape hatches (`listTools`, `callTool`) - Workflow only',
    '- `listTools` use it to discover available tool names on the connected MCP server.',
    '- `callTool` can invoke any MCP tool.',
    '',
    '### Common gotchas',
    '- The MCP server URL is workspace-specific — each Databricks workspace has a different hostname.',
    '- REST API calls derive the workspace base URL from the configured MCP server URL automatically.',
    '- Databricks SQL identifiers (catalog, schema, table) are case-insensitive but returned in lowercase.',
  ].join('\n'),
};
