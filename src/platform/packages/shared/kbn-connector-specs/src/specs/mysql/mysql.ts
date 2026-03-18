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

const buildBaseUrl = (ctx: ActionContext) => {
  const host = (ctx.config?.host as string).trim();
  const port = ctx.config?.port as number;
  return `${host}:${port}`;
};

const escapeIdentifier = (identifier: string): string => {
  return `\`${identifier.replace(/`/g, '``')}\``;
};

const escapeLikeValue = (value: string): string => {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/'/g, "''");
};

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
          defaultMessage: 'The MySQL HTTP proxy host (URL, hostname, or IP address)',
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
            'The hostname, IP address, or URL of the MySQL HTTP proxy (e.g. https://proxy.example.com, 192.168.1.1, localhost)',
        }),
      }),
    port: z
      .coerce.number()
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
        placeholder: '3306',
        helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.helpText', {
          defaultMessage: 'The port number for the MySQL HTTP proxy (default: 3306)',
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
  }),

  actions: {
    // Execute a read-only SQL query
    query: {
      isTool: false,
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/query`, {
          sql: input.sql,
          database: ctx.config?.database,
          maxRows: input.maxRows ?? 100,
        });
        return response.data;
      },
    },

    // List all databases accessible to the user
    listDatabases: {
      isTool: false,
      input: ListDatabasesInputSchema,
      handler: async (ctx) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/query`, {
          sql: 'SHOW DATABASES',
        });
        return response.data;
      },
    },

    // List tables in a database
    listTables: {
      isTool: false,
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const db = input.database ?? (ctx.config?.database as string);
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/query`, {
          sql: `SHOW TABLES FROM ${escapeIdentifier(db)}`,
          database: db,
        });
        return response.data;
      },
    },

    // Describe a table's schema
    describeTable: {
      isTool: false,
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const db = input.database ?? (ctx.config?.database as string);
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/query`, {
          sql: `DESCRIBE ${escapeIdentifier(db)}.${escapeIdentifier(input.table)}`,
          database: db,
        });
        return response.data;
      },
    },

    // Search across tables using LIKE patterns on specified columns
    searchRows: {
      isTool: false,
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const db = input.database ?? (ctx.config?.database as string);
        const baseUrl = buildBaseUrl(ctx);
        const escaped = escapeLikeValue(input.searchTerm);
        const whereClause = input.columns
          .map((col: string) => `${escapeIdentifier(col)} LIKE '%${escaped}%'`)
          .join(' OR ');
        const response = await ctx.client.post(`${baseUrl}/query`, {
          sql: `SELECT * FROM ${escapeIdentifier(db)}.${escapeIdentifier(
            input.table
          )} WHERE ${whereClause} LIMIT ${input.maxRows ?? 50}`,
          database: db,
        });
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.test.description', {
      defaultMessage: 'Verifies MySQL connection by listing accessible databases',
    }),
    handler: async (ctx) => {
      try {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/query`, {
          sql: 'SELECT 1',
        });
        return {
          ok: true,
          message: `Successfully connected to MySQL at ${baseUrl}: ${JSON.stringify(
            response.data
          )}`,
        };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  },
};
