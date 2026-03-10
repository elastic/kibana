/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const SNOWFLAKE_SQL_API_PATH = '/api/v2/statements';

function buildApiUrl(accountUrl: string, path: string = SNOWFLAKE_SQL_API_PATH): string {
  const base = accountUrl.replace(/\/+$/, '');
  return `${base}${path}`;
}

interface StatementRequest {
  statement: string;
  timeout?: number;
  database?: string;
  schema?: string;
  warehouse?: string;
  role?: string;
}

function buildStatementBody(
  sql: string,
  ctx: { config?: Record<string, unknown> },
  overrides?: { database?: string; schema?: string; warehouse?: string; role?: string }
): StatementRequest {
  const body: StatementRequest = { statement: sql, timeout: 60 };
  const db = overrides?.database ?? (ctx.config?.database as string | undefined);
  const schema = overrides?.schema ?? (ctx.config?.schema as string | undefined);
  const warehouse = overrides?.warehouse ?? (ctx.config?.warehouse as string | undefined);
  const role = overrides?.role ?? (ctx.config?.role as string | undefined);
  if (db) body.database = db;
  if (schema) body.schema = schema;
  if (warehouse) body.warehouse = warehouse;
  if (role) body.role = role;
  return body;
}

function getAccountUrl(ctx: { config?: Record<string, unknown> }): string {
  const url = ctx.config?.accountUrl as string | undefined;
  if (!url || url.trim() === '') {
    throw new Error(
      'Snowflake connector is not configured: accountUrl is required (e.g. https://<account>.snowflakecomputing.com).'
    );
  }
  return url;
}

const SNOWFLAKE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'KibanaConnector/1.0',
};

export const SnowflakeConnector: ConnectorSpec = {
  metadata: {
    id: '.snowflake',
    displayName: 'Snowflake',
    description: i18n.translate('core.kibanaConnectorSpecs.snowflake.metadata.description', {
      defaultMessage:
        'Connect to Snowflake to execute SQL queries and explore your data warehouse',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.snowflake.auth.tokenLabel', {
                defaultMessage: 'Authentication token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.auth.tokenHelpText', {
                defaultMessage:
                  'A JWT (key pair auth), OAuth token, or Programmatic Access Token (PAT) for your Snowflake account.',
              }),
            },
          },
        },
      },
    ],
    // Snowflake auto-detects token type (KEYPAIR_JWT, OAUTH, or PROGRAMMATIC_ACCESS_TOKEN)
    // when the X-Snowflake-Authorization-Token-Type header is omitted.
  },

  schema: z.object({
    accountUrl: z
      .string()
      .url()
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.accountUrlLabel', {
          defaultMessage: 'Account URL',
        }),
        widget: 'text',
        placeholder: 'https://<account_identifier>.snowflakecomputing.com',
      }),
    warehouse: z
      .string()
      .optional()
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.warehouseLabel', {
          defaultMessage: 'Warehouse',
        }),
        widget: 'text',
        placeholder: 'COMPUTE_WH',
      }),
    database: z
      .string()
      .optional()
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.databaseLabel', {
          defaultMessage: 'Database',
        }),
        widget: 'text',
        placeholder: 'MY_DATABASE',
      }),
    schema: z
      .string()
      .optional()
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.schemaLabel', {
          defaultMessage: 'Schema',
        }),
        widget: 'text',
        placeholder: 'PUBLIC',
      }),
    role: z
      .string()
      .optional()
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.roleLabel', {
          defaultMessage: 'Role',
        }),
        widget: 'text',
        placeholder: 'SYSADMIN',
      }),
  }),

  validateUrls: {
    fields: ['accountUrl'],
  },

  policies: {
    retry: {
      retryOnStatusCodes: [429, 503],
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
    },
    error: {
      userErrorCodes: [400, 401, 403, 404, 422],
      systemErrorCodes: [500, 502, 503, 504],
    },
  },

  actions: {
    executeSql: {
      input: z.object({
        statement: z
          .string()
          .describe('SQL statement to execute. Prefer LIMIT to keep result sets manageable.'),
        timeout: z
          .number()
          .optional()
          .describe('Query timeout in seconds (default 60, max 604800).'),
        database: z.string().optional().describe('Override the default database for this query.'),
        schema: z.string().optional().describe('Override the default schema for this query.'),
        warehouse: z.string().optional().describe('Override the default warehouse for this query.'),
        role: z.string().optional().describe('Override the default role for this query.'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          statement: string;
          timeout?: number;
          database?: string;
          schema?: string;
          warehouse?: string;
          role?: string;
        };
        const accountUrl = getAccountUrl(ctx);
        const body = buildStatementBody(typedInput.statement, ctx, {
          database: typedInput.database,
          schema: typedInput.schema,
          warehouse: typedInput.warehouse,
          role: typedInput.role,
        });
        if (typedInput.timeout) {
          body.timeout = typedInput.timeout;
        }
        const response = await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return response.data;
      },
    },

    getStatementStatus: {
      input: z.object({
        statementHandle: z
          .string()
          .describe('Statement handle returned from a previous executeSql call.'),
        partition: z.number().optional().describe('Partition index for large result sets.'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { statementHandle: string; partition?: number };
        const accountUrl = getAccountUrl(ctx);
        const params: Record<string, unknown> = {};
        if (typedInput.partition !== undefined) {
          params.partition = typedInput.partition;
        }
        const response = await ctx.client.get(
          buildApiUrl(accountUrl, `${SNOWFLAKE_SQL_API_PATH}/${encodeURIComponent(typedInput.statementHandle)}`),
          { headers: SNOWFLAKE_HEADERS, params }
        );
        return response.data;
      },
    },

    cancelStatement: {
      input: z.object({
        statementHandle: z
          .string()
          .describe('Statement handle of the running query to cancel.'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { statementHandle: string };
        const accountUrl = getAccountUrl(ctx);
        const response = await ctx.client.post(
          buildApiUrl(accountUrl, `${SNOWFLAKE_SQL_API_PATH}/${encodeURIComponent(typedInput.statementHandle)}/cancel`),
          {},
          { headers: SNOWFLAKE_HEADERS }
        );
        return response.data;
      },
    },

    listDatabases: {
      input: z.object({}),
      handler: async (ctx) => {
        const accountUrl = getAccountUrl(ctx);
        const body = buildStatementBody('SHOW DATABASES', ctx);
        const response = await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return response.data;
      },
    },

    listSchemas: {
      input: z.object({
        database: z
          .string()
          .optional()
          .describe('Database name to list schemas for. Uses configured default if omitted.'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { database?: string };
        const accountUrl = getAccountUrl(ctx);
        const db = typedInput.database ?? (ctx.config?.database as string | undefined);
        const sql = db ? `SHOW SCHEMAS IN DATABASE ${db}` : 'SHOW SCHEMAS';
        const body = buildStatementBody(sql, ctx);
        const response = await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return response.data;
      },
    },

    listTables: {
      input: z.object({
        database: z.string().optional().describe('Database name. Uses configured default if omitted.'),
        schema: z.string().optional().describe('Schema name. Uses configured default if omitted.'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { database?: string; schema?: string };
        const accountUrl = getAccountUrl(ctx);
        const db = typedInput.database ?? (ctx.config?.database as string | undefined);
        const schemaName = typedInput.schema ?? (ctx.config?.schema as string | undefined);
        let sql = 'SHOW TABLES';
        if (db && schemaName) {
          sql = `SHOW TABLES IN ${db}.${schemaName}`;
        } else if (db) {
          sql = `SHOW TABLES IN DATABASE ${db}`;
        } else if (schemaName) {
          sql = `SHOW TABLES IN SCHEMA ${schemaName}`;
        }
        const body = buildStatementBody(sql, ctx);
        const response = await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return response.data;
      },
    },

    describeTable: {
      input: z.object({
        tableName: z
          .string()
          .describe(
            'Fully-qualified or unqualified table name (e.g. MY_DB.PUBLIC.MY_TABLE or just MY_TABLE).'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { tableName: string };
        const accountUrl = getAccountUrl(ctx);
        const body = buildStatementBody(`DESCRIBE TABLE ${typedInput.tableName}`, ctx);
        const response = await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return response.data;
      },
    },

    listWarehouses: {
      input: z.object({}),
      handler: async (ctx) => {
        const accountUrl = getAccountUrl(ctx);
        const body = buildStatementBody('SHOW WAREHOUSES', ctx);
        const response = await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.snowflake.test.description', {
      defaultMessage: 'Verifies Snowflake connection by running SELECT CURRENT_VERSION()',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Snowflake test handler');
      try {
        const accountUrl = getAccountUrl(ctx);
        const body = buildStatementBody('SELECT CURRENT_VERSION()', ctx);
        await ctx.client.post(buildApiUrl(accountUrl), body, {
          headers: SNOWFLAKE_HEADERS,
        });
        return {
          ok: true,
          message: 'Successfully connected to Snowflake',
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
};
