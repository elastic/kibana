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
  ExecuteStatementInput,
  RunQueryInput,
  PollResponseInput,
} from './types';
import {
  CallToolInputSchema,
  ExecuteStatementInputSchema,
  ListToolsInputSchema,
  PollResponseInputSchema,
  RunQueryInputSchema,
} from './types';

export const Databricks: ConnectorSpec = {
  metadata: {
    id: '.databricks',
    displayName: 'Databricks',
    description: i18n.translate('core.kibanaConnectorSpecs.databricks.metadata.description', {
      defaultMessage:
        'Execute SQL queries, discover tables and schemas, and poll async query results in Databricks',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          scope: 'sql offline_access',
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
                "The Databricks SQL MCP server URL for your workspace. Replace '{workspace}' with your workspace hostname. " +
                'For other MCP server types (Genie, AI Search), change the path accordingly.',
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
      isTool: true,
      description:
        'List all tools available on the Databricks MCP server. Use this to discover server capabilities ' +
        'and verify exact tool names before using callTool. Different Databricks MCP servers expose ' +
        'different tools — the SQL server provides execute_sql, execute_sql_read_only, and poll_sql_result, ' +
        'while the Genie server provides query_space and poll_response.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      description:
        'Call any tool on the Databricks MCP server directly by name. Use this as an escape hatch for tools ' +
        'not yet exposed as named actions, or for tools on non-SQL Databricks MCP servers (such as Genie ' +
        'query_space or AI Search). Use listTools first to discover available tool names and their arguments.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
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
          ok: true,
          message: `Connected to Databricks MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skill: [
    '## Databricks Connector — usage guidance',
    '',
    '### Choosing between `runQuery` and `executeStatement`',
    '- Use `runQuery` for read-only SQL: SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH queries.',
    '- Use `executeStatement` for DML (INSERT, UPDATE, DELETE) or DDL (CREATE, ALTER, DROP) — this action is available to workflows but is not exposed to AI agents.',
    '- Prefer `runQuery` for all data exploration and analytics — it prevents accidental mutations.',
    '',
    '### Async polling pattern',
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
    '### Common gotchas',
    '- The MCP server URL is workspace-specific — each Databricks workspace has a different hostname.',
    '- If queries fail with a warehouse unavailable error, inform the user that the SQL warehouse may need to be started in the Databricks workspace UI — this requires manual operator action.',
    '- Result sets for large queries are returned in chunks. Check the response metadata for pagination info.',
    '- Databricks SQL identifiers (catalog, schema, table) are case-insensitive but returned in lowercase.',
  ].join('\n'),
};
