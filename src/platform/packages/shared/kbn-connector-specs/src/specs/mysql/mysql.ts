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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, escapeLikePattern } from '../generic_db/generic_db_connector';
import {
  DescribeTableInputSchema,
  ListDatabasesInputSchema,
  ListTablesInputSchema,
  QueryInputSchema,
  SearchRowsInputSchema,
  type DescribeTableInput,
  type ListTablesInput,
  type QueryInput,
  type SearchRowsInput,
} from './types';

export const MysqlConnector: ConnectorSpec = {
  metadata: {
    id: '.mysql',
    displayName: 'MySQL',
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.metadata.description', {
      defaultMessage: 'Connect to MySQL to search and query your databases.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer'],
  },

  schema: z.object({
    host: z
      .string()
      .min(1)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.mysql.config.host.description', {
          defaultMessage:
            'The MySQL HTTP proxy host — must include the protocol (http:// or https://)',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.host.label', {
          defaultMessage: 'Host',
        }),
        placeholder: 'https://your-mysql-proxy.example.com',
        helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.host.helpText', {
          defaultMessage:
            'The URL of the MySQL HTTP proxy, including protocol ' +
            '(for example, https://proxy.example.com). Use http:// for local development only.',
        }),
      }),
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.description', {
          defaultMessage: 'The MySQL HTTP proxy port',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.label', {
          defaultMessage: 'Port',
        }),
        placeholder: '8080',
        helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.helpText', {
          defaultMessage: 'The port number for the MySQL HTTP proxy (default: 8080)',
        }),
      }),
    database: z
      .string()
      .min(1)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.mysql.config.database.description', {
          defaultMessage: 'The default database to connect to',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.database.label', {
          defaultMessage: 'Database',
        }),
        placeholder: 'my_database',
        helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.database.helpText', {
          defaultMessage: 'The name of the default database to query',
        }),
      }),
    username: z
      .string()
      .min(1)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.mysql.config.username.description', {
          defaultMessage: 'The MySQL username',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.username.label', {
          defaultMessage: 'Username',
        }),
        placeholder: 'root',
        helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.username.helpText', {
          defaultMessage: 'The MySQL user to authenticate as',
        }),
      }),
    password: z
      .string()
      .min(1)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.mysql.config.password.description', {
          defaultMessage: 'The MySQL password',
        })
      )
      .meta({
        widget: 'password',
        sensitive: true,
        label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.password.label', {
          defaultMessage: 'Password',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.password.helpText', {
          defaultMessage: 'The password for the MySQL user',
        }),
      }),
  }),

  actions: {
    query: {
      isTool: false,
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) =>
        executeQuery(ctx, input.sql, ctx.config?.database as string, input.maxRows ?? 100),
    },

    listDatabases: {
      isTool: false,
      input: ListDatabasesInputSchema,
      handler: async (ctx) => {
        const response = await ctx.client.post(`${buildBaseUrl(ctx)}/query`, {
          ...resolveCredentials(ctx),
          sql: 'SHOW DATABASES',
        });
        return response.data;
      },
    },

    listTables: {
      isTool: false,
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const db = resolveDatabase(input.database, ctx);
        const response = await ctx.client.post(`${buildBaseUrl(ctx)}/query`, {
          ...resolveCredentials(ctx),
          sql: `SHOW TABLES FROM ${quoteIdentifier(db)}`,
          database: db,
        });
        return response.data;
      },
    },

    describeTable: {
      isTool: false,
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const db = resolveDatabase(input.database, ctx);
        const response = await ctx.client.post(`${buildBaseUrl(ctx)}/query`, {
          ...resolveCredentials(ctx),
          sql: `DESCRIBE ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}`,
          database: db,
        });
        return response.data;
      },
    },

    searchRows: {
      isTool: false,
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const db = resolveDatabase(input.database, ctx);
        const escaped = escapeLikePattern(input.searchTerm);
        const whereClause = input.columns
          .map((col) => `${quoteIdentifier(col)} LIKE '%${escaped}%' ESCAPE '!'`)
          .join(' OR ');
        const sql =
          `SELECT * FROM ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}` +
          ` WHERE ${whereClause} LIMIT ${Math.floor(input.maxRows ?? 50)}`;
        return executeQuery(ctx, sql, db, input.maxRows ?? 50);
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.test.description', {
      defaultMessage: 'Verifies MySQL connection by running a lightweight query',
    }),
    handler: async (ctx) => {
      try {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/query`, {
          ...resolveCredentials(ctx),
          sql: 'SELECT 1',
        });
        return {
          ok: true,
          message:
            `Successfully connected to MySQL at ${baseUrl}: ` + JSON.stringify(response.data),
        };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  },
};

// ---------------------------------------------------------------------------
// MySQL-specific utilities
// ---------------------------------------------------------------------------

/**
 * Quote a MySQL identifier (table, column, or database name) with backticks,
 * escaping any embedded backtick characters.
 * Note: MySQL uses backticks; this is not portable to other SQL dialects.
 */
const quoteIdentifier = (identifier: string): string => `\`${identifier.replace(/`/g, '``')}\``;

/**
 * Execute a read-only SQL query via the HTTP proxy. Shared by the `query` and
 * `searchRows` actions so both go through the same validation and transport.
 */
const executeQuery = async (
  ctx: ActionContext,
  sql: string,
  database: string | undefined,
  maxRows: number
) => {
  assertReadOnly(sql);
  const response = await ctx.client.post(`${buildBaseUrl(ctx)}/query`, {
    ...resolveCredentials(ctx),
    sql,
    database,
    maxRows,
  });
  return response.data;
};

// ---------------------------------------------------------------------------
// HTTP connector helpers
// ---------------------------------------------------------------------------

/**
 * Build the base URL for the HTTP proxy from connector config.
 * Expects config.host to include the protocol (http:// or https://).
 */
const buildBaseUrl = (ctx: ActionContext): string => {
  const host = (ctx.config?.host as string).trim();
  const port = ctx.config?.port as number;
  return `${host}:${port}`;
};

/**
 * Resolve the target database, preferring the per-action override then the
 * connector-level default. Throws rather than silently producing a bogus
 * identifier if neither is set.
 */
const resolveDatabase = (inputDb: string | undefined, ctx: ActionContext): string => {
  const db = inputDb ?? (ctx.config?.database as string | undefined);
  if (!db) {
    throw new Error(
      'No database specified and no default database is configured for this connector'
    );
  }
  return db;
};

/**
 * Extract credentials from connector config to include in each request to the
 * HTTP proxy.
 */
const resolveCredentials = (ctx: ActionContext) => ({
  username: ctx.config?.username as string,
  password: ctx.config?.password as string,
});
