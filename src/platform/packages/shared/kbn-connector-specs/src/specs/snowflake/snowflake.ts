/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Snowflake Connector (v2)
 *
 * Wraps the Snowflake SQL REST API (v2) to execute arbitrary SQL asynchronously,
 * poll for statement status / results, and cancel running statements.
 *
 * Auth:
 *  - OAuth 2.0 Authorization Code with PKCE (Snowflake managed OAuth)
 *  - Bearer token (PAT — Snowflake programmatic access token or manually obtained OAuth token)
 *
 * API reference: https://docs.snowflake.com/en/developer-guide/sql-api/reference
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import type { ExecuteStatementInput, GetStatementStatusInput, CancelStatementInput } from './types';
import {
  ExecuteStatementInputSchema,
  GetStatementStatusInputSchema,
  CancelStatementInputSchema,
} from './types';

const SNOWFLAKE_SQL_API_PATH = '/api/v2/statements';
const SNOWFLAKE_USER_AGENT = 'Kibana-Snowflake-Connector/1.0';

export const Snowflake: ConnectorSpec = {
  metadata: {
    id: '.snowflake',
    displayName: 'Snowflake',
    description: i18n.translate('core.kibanaConnectorSpecs.snowflake.metadata.description', {
      defaultMessage:
        'Execute SQL queries, check statement status, and cancel running statements in Snowflake',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {
          token: '',
        },
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.snowflake.auth.pat.label', {
                defaultMessage: 'Snowflake access token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.auth.pat.helpText', {
                defaultMessage:
                  'A Snowflake programmatic access token (PAT) or manually obtained OAuth access token.',
              }),
            },
          },
        },
      },
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: '',
          tokenUrl: '',
          scope: '',
          useBasicAuth: true,
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://<account>.snowflakecomputing.com/oauth/authorize',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.snowflake.auth.oauth.authorizationUrl.helpText',
                {
                  defaultMessage:
                    'Snowflake OAuth authorization URL. Replace <account> with your Snowflake account identifier.',
                }
              ),
            },
            tokenUrl: {
              placeholder: 'https://<account>.snowflakecomputing.com/oauth/token-request',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.snowflake.auth.oauth.tokenUrl.helpText',
                {
                  defaultMessage:
                    'Snowflake OAuth token endpoint. Replace <account> with your Snowflake account identifier.',
                }
              ),
            },
            scope: {
              hidden: true,
            },
          },
        },
      },
    ],
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': SNOWFLAKE_USER_AGENT,
    },
  },

  schema: z.object({
    accountUrl: UISchemas.url()
      .describe('Snowflake account URL')
      .meta({
        widget: 'text',
        placeholder: 'https://<account>.snowflakecomputing.com',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.accountUrl.label', {
          defaultMessage: 'Snowflake Account URL',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.accountUrl.helpText', {
          defaultMessage:
            'The base URL for your Snowflake account (e.g. https://myorg-myaccount.snowflakecomputing.com).',
        }),
      }),
    warehouse: z
      .string()
      .optional()
      .describe('Default warehouse for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'COMPUTE_WH',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.warehouse.label', {
          defaultMessage: 'Default Warehouse',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.warehouse.helpText', {
          defaultMessage:
            'Default warehouse to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
    database: z
      .string()
      .optional()
      .describe('Default database for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'MY_DATABASE',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.database.label', {
          defaultMessage: 'Default Database',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.database.helpText', {
          defaultMessage:
            'Default database to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
    defaultSchema: z
      .string()
      .optional()
      .describe('Default schema for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'PUBLIC',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.schema.label', {
          defaultMessage: 'Default Schema',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.schema.helpText', {
          defaultMessage:
            'Default schema to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
    role: z
      .string()
      .optional()
      .describe('Default role for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'PUBLIC',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.role.label', {
          defaultMessage: 'Default Role',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.role.helpText', {
          defaultMessage:
            'Default role to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
  }),

  validateUrls: {
    fields: ['accountUrl'],
  },

  actions: {
    executeStatement: {
      isTool: true,
      description:
        'Execute a SQL statement asynchronously in Snowflake. Returns immediately with a statement handle that can be used to poll for results via getStatementStatus or cancel via cancelStatement. Supports bind variables, multi-statement execution, and session-scoped context (warehouse, database, schema, role). Always executes asynchronously — use getStatementStatus to retrieve results.',
      input: ExecuteStatementInputSchema,
      handler: async (ctx, input: ExecuteStatementInput) => {
        const config = ctx.config as {
          accountUrl: string;
          warehouse?: string;
          database?: string;
          defaultSchema?: string;
          role?: string;
        };

        const body: Record<string, unknown> = {
          statement: input.statement,
        };

        if (input.timeout !== undefined) body.timeout = input.timeout;
        if (input.bindings) body.bindings = input.bindings;

        const warehouse = input.warehouse ?? config.warehouse;
        const database = input.database ?? config.database;
        const schema = input.schema ?? config.defaultSchema;
        const role = input.role ?? config.role;

        if (warehouse) body.warehouse = warehouse;
        if (database) body.database = database;
        if (schema) body.schema = schema;
        if (role) body.role = role;

        if (input.multiStatementCount !== undefined) {
          body.parameters = {
            ...(body.parameters as Record<string, unknown> | undefined),
            MULTI_STATEMENT_COUNT: String(input.multiStatementCount),
          };
        }
        if (input.queryTag) {
          body.parameters = {
            ...(body.parameters as Record<string, unknown> | undefined),
            QUERY_TAG: input.queryTag,
          };
        }

        const url = `${config.accountUrl}${SNOWFLAKE_SQL_API_PATH}`;

        const response = await ctx.client.post(url, body, {
          params: { async: true },
          headers: {
            'X-Snowflake-Authorization-Token-Type': 'OAUTH',
          },
          validateStatus: (status) => status === 200 || status === 202,
        });

        return response.data;
      },
    },

    getStatementStatus: {
      isTool: true,
      description:
        'Check the status of a previously submitted SQL statement and retrieve results if execution is complete. Returns HTTP 200 with a ResultSet when finished, or HTTP 202 with a QueryStatus if still running. Use the statementHandle from the executeStatement response. For large result sets, use the partition parameter to page through data.',
      input: GetStatementStatusInputSchema,
      handler: async (ctx, input: GetStatementStatusInput) => {
        const config = ctx.config as { accountUrl: string };

        const params: Record<string, unknown> = {};
        if (input.partition !== undefined) params.partition = input.partition;

        const url = `${config.accountUrl}${SNOWFLAKE_SQL_API_PATH}/${input.statementHandle}`;

        const response = await ctx.client.get(url, {
          params,
          headers: {
            'X-Snowflake-Authorization-Token-Type': 'OAUTH',
          },
          validateStatus: (status) => status === 200 || status === 202,
        });

        return response.data;
      },
    },

    cancelStatement: {
      isTool: true,
      description:
        'Cancel a running SQL statement in Snowflake. Use the statementHandle from the executeStatement response. Returns a confirmation with the cancellation status. Only works on statements that are still executing.',
      input: CancelStatementInputSchema,
      handler: async (ctx, input: CancelStatementInput) => {
        const config = ctx.config as { accountUrl: string };

        const url = `${config.accountUrl}${SNOWFLAKE_SQL_API_PATH}/${input.statementHandle}/cancel`;

        const response = await ctx.client.post(
          url,
          {},
          {
            headers: {
              'X-Snowflake-Authorization-Token-Type': 'OAUTH',
            },
            validateStatus: (status) => status === 200 || status === 422,
          }
        );

        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.snowflake.test.description', {
      defaultMessage:
        'Verifies connection to Snowflake by executing SELECT CURRENT_VERSION() and returning the result.',
    }),
    handler: async (ctx) => {
      const config = ctx.config as { accountUrl: string };
      const url = `${config.accountUrl}${SNOWFLAKE_SQL_API_PATH}`;

      const response = await ctx.client.post(
        url,
        { statement: 'SELECT CURRENT_VERSION()' },
        {
          headers: {
            'X-Snowflake-Authorization-Token-Type': 'OAUTH',
          },
          validateStatus: (status) => status === 200 || status === 202,
        }
      );

      if (response.status === 200 && response.data?.data) {
        return {
          ok: true,
          message: `Connected to Snowflake. Version: ${response.data.data[0]?.[0] ?? 'unknown'}`,
        };
      }

      return {
        ok: true,
        message: `Connected to Snowflake. Statement submitted (handle: ${
          response.data?.statementHandle ?? 'unknown'
        }).`,
      };
    },
  },

  skill: [
    '## Snowflake SQL Connector',
    '',
    'This connector executes SQL against the Snowflake SQL REST API. All queries run asynchronously.',
    '',
    '### Execution pattern',
    '1. Call `executeStatement` with your SQL. It returns a `statementHandle`.',
    '2. Call `getStatementStatus` with that handle to poll for results.',
    '   - HTTP 202 means still running — wait and poll again.',
    '   - HTTP 200 means complete — the response contains `data` (array of row arrays) and `resultSetMetaData` (column definitions).',
    '3. If the query is no longer needed, call `cancelStatement` with the handle.',
    '',
    '### Multi-statement execution',
    'Separate statements with semicolons and set `multiStatementCount` to the number of statements (or 0 for variable count). The response includes `statementHandles` for each individual statement.',
    '',
    '### Bind variables',
    'Use `?` placeholders in the SQL and provide `bindings` with 1-based keys. All binding values are strings. Example: `{"1": {"type": "TEXT", "value": "hello"}}`.',
    '',
    '### Context defaults',
    'The connector config provides default warehouse, database, schema, and role. Per-request values in executeStatement override these defaults.',
    '',
    '### Result set pagination',
    'Large result sets are split into partitions by Snowflake. Use `getStatementStatus` with different `partition` values (0-based) to retrieve each partition. The `resultSetMetaData.partitionInfo` array describes the row count and size of each partition.',
    '',
    '### Important notes',
    '- Snowflake identifiers (database, schema, warehouse, role) are case-sensitive and must match the casing returned by SHOW commands.',
    '- The SQL API does not support all Snowflake SQL — see Snowflake docs for limitations.',
    '- Bind variables are not supported in multi-statement requests.',
  ].join('\n'),
};
