/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * MySQL Connector
 *
 * Connects directly to a MySQL database over the native MySQL wire protocol
 * (via `mysql2`) rather than HTTP — there is no vendor REST/MCP API to wrap.
 * `ctx.client` (an `AxiosInstance`) is never used; a `mysql2` connection pool
 * is opened directly from `ctx.config` / `ctx.secrets` instead.
 *
 * Username and password are declared under `auth: { types: ['basic'] }`
 * rather than `schema`, even though nothing here makes an HTTP request.
 * `schema` fields are stored unencrypted, so credentials must go through
 * `auth` to be encrypted at rest — `basic`'s username/password shape is a
 * convenient fit. `configure()` (which sets `axiosInstance.defaults.auth`)
 * runs but is unused; the handlers read the credentials from `ctx.secrets`.
 *
 * All actions are read-only: `assertReadOnly` (see `lib/generic_db_connector`)
 * rejects any statement that doesn't start with SELECT/SHOW/DESCRIBE/DESC/
 * EXPLAIN/WITH, and rejects semicolon-delimited multi-statement input. Query
 * execution wraps user SQL in a bounded outer SELECT so `maxRows` is always
 * enforced server-side.
 */
import type { Pool as Mysql2Pool } from 'mysql2/promise';
import { Sha256 } from '@kbn/crypto-browser';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, escapeLikePattern } from '../../lib/generic_db_connector';
import {
  type DescribeTableInput,
  DescribeTableInputSchema,
  ListDatabasesInputSchema,
  type ListTablesInput,
  ListTablesInputSchema,
  type QueryInput,
  QueryInputSchema,
  type SearchRowsInput,
  SearchRowsInputSchema,
} from './types';

export const MysqlConnector: ConnectorSpec = {
  metadata: {
    id: '.mysql',
    displayName: 'MySQL',
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.metadata.description', {
      defaultMessage:
        'Query tables, search rows, and explore schema in a MySQL database using read-only SQL',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['basic'],
  },

  schema: lazySchema(() =>
    z.object({
      host: z
        .string()
        .min(1)
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.mysql.config.host.description', {
            defaultMessage: 'The MySQL server hostname or IP address',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.host.label', {
            defaultMessage: 'Host',
          }),
          placeholder: 'mysql.example.com',
          helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.host.helpText', {
            defaultMessage: 'The hostname or IP address of the MySQL server (no protocol prefix).',
          }),
        }),
      port: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.description', {
            defaultMessage: 'The MySQL server port',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '3306',
          helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.port.helpText', {
            defaultMessage: 'The port number of the MySQL server (default: 3306)',
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
    })
  ),

  actions: {
    query: {
      isTool: true,
      description:
        'Execute a read-only SQL SELECT query against the MySQL database. Only SELECT statements are permitted; INSERT, UPDATE, DELETE, and DDL are blocked. Returns up to maxRows rows (default 100). Use listTables first to discover available tables, and describeTable to inspect column names before writing queries. Prefer WHERE clauses and explicit column lists to keep result size manageable.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) =>
        getClient().runReadonlyQuery(ctx, input.sql, input.maxRows ?? 100),
    },

    listDatabases: {
      isTool: true,
      description:
        'List all databases available on the connected MySQL server. Use this first to discover what databases are accessible before querying tables.',
      input: ListDatabasesInputSchema,
      handler: async (ctx) => getClient().runQuery(ctx, 'SHOW DATABASES'),
    },

    listTables: {
      isTool: true,
      description:
        'List all tables in a MySQL database. Specify database to target a specific database, or omit to use the configured default. Use describeTable to inspect column names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const db = resolveDatabase(input.database, ctx);
        return getClient().runQuery(ctx, `SHOW TABLES FROM ${quoteIdentifier(db)}`);
      },
    },

    describeTable: {
      isTool: true,
      description:
        'Describe the structure of a MySQL table — returns column names, data types, nullability, and default values. Use this before query or searchRows to discover available columns and build correct queries.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const db = resolveDatabase(input.database, ctx);
        return getClient().runQuery(
          ctx,
          `DESCRIBE ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}`
        );
      },
    },

    searchRows: {
      isTool: true,
      description:
        'Search for rows in a MySQL table by matching a text value against one or more columns using LIKE pattern matching (case-insensitive partial match). Returns up to maxRows results (default 100). Use describeTable first to discover searchable column names. Prefer query (SQL SELECT) for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const db = resolveDatabase(input.database, ctx);
        const likeParam = `%${escapeLikePattern(input.searchTerm)}%`;
        const whereClause = input.columns
          .map((col) => `${quoteIdentifier(col)} LIKE ? ESCAPE '!'`)
          .join(' OR ');
        const sql =
          `SELECT * FROM ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}` +
          ` WHERE ${whereClause} LIMIT ?`;
        const params = [...input.columns.map(() => likeParam), input.maxRows ?? 100];
        return getClient().runParamQuery(ctx, sql, params);
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.test.description', {
      defaultMessage: 'Verifies MySQL connection by running a lightweight query',
    }),
    handler: async (ctx) => {
      try {
        await getClient().runQuery(ctx, 'SELECT 1');
        return { ok: true, message: `Successfully connected to MySQL` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, message };
      }
    },
  },

  skill: [
    '## MySQL Connector',
    '',
    'Read-only access to a MySQL database. All statements are checked before execution — only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH are allowed, and semicolon-delimited multi-statement submissions are rejected.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listDatabases` — see what databases are accessible.',
    '2. `listTables` — list tables in a database (defaults to the configured database if omitted).',
    '3. `describeTable` — inspect column names, types, and nullability before writing a query.',
    '4. `query` or `searchRows` — read the data.',
    '',
    '### Choosing between `query` and `searchRows`',
    '- Prefer `query` for structured filtering, joins, aggregation, or anything expressible as a SELECT.',
    '- Prefer `searchRows` for broad, unstructured text lookups across a known set of columns — it builds a LIKE-based search so you do not need to hand-write SQL wildcards.',
    '',
    '### Gotchas',
    '- Write, DDL, and multi-statement SQL are rejected outright — there is no workflow-only escape hatch for this connector; ask the user to run those directly against the database.',
    '- `query` and `searchRows` cap results at `maxRows` (default 100, max 1000) to keep responses small — narrow the query with WHERE clauses rather than relying on a large `maxRows`.',
    '- Database and table names are case-sensitive on case-sensitive filesystems (the common case on Linux). Use the exact casing returned by `listDatabases` / `listTables`.',
  ].join('\n'),
};

type ExecuteParams = NonNullable<Parameters<Mysql2Pool['execute']>[1]>;

class MysqlClient {
  private static readonly MAX_POOLS = 10;
  private readonly pools = new Map<string, Mysql2Pool>();

  async runQuery(ctx: ActionContext, sql: string): Promise<unknown[]> {
    const [rows] = await (await this.getPool(ctx)).query(sql);
    return rows as unknown[];
  }

  async runReadonlyQuery(ctx: ActionContext, sql: string, maxRows: number): Promise<unknown[]> {
    assertReadOnly(sql);
    const [rows] = await (
      await this.getPool(ctx)
    ).execute(`SELECT * FROM (\n${sql}\n) AS _q LIMIT ?`, [maxRows]);
    return rows as unknown[];
  }

  async runParamQuery(ctx: ActionContext, sql: string, params: ExecuteParams): Promise<unknown[]> {
    const [rows] = await (await this.getPool(ctx)).execute(sql, params);
    return rows as unknown[];
  }

  private async getPool(ctx: ActionContext): Promise<Mysql2Pool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const database = ctx.config?.database as string;
    const username = ctx.secrets?.username as string;
    const password = ctx.secrets?.password as string;

    const passwordHash = new Sha256().update(password).digest('hex');
    const key = `${host}:${port}:${database}:${username}:${passwordHash}`;
    let pool = this.pools.get(key);
    if (!pool) {
      if (this.pools.size >= MysqlClient.MAX_POOLS) {
        const [oldestKey] = this.pools.keys();
        if (oldestKey) {
          const oldPool = this.pools.get(oldestKey);
          this.pools.delete(oldestKey);
          ctx.log.info(`[mysql] Pool cache full (${MysqlClient.MAX_POOLS}), evicting oldest pool`);
          await oldPool?.end();
        }
      }
      ctx.log.info(
        `[mysql] Creating connection pool for ${host}:${port}/${database} (user: ${username})`
      );
      const lib = await import('mysql2/promise');
      pool = lib.createPool({
        host,
        port,
        database,
        user: username,
        password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      this.pools.set(key, pool);
    }
    return pool;
  }
}

const _client = new MysqlClient();
const getClient = () => _client;

const quoteIdentifier = (identifier: string): string => `\`${identifier.replace(/`/g, '``')}\``;

const resolveDatabase = (inputDb: string | undefined, ctx: ActionContext): string => {
  const db = inputDb ?? (ctx.config?.database as string | undefined);
  if (!db) {
    throw new Error(
      'No database specified and no default database is configured for this connector'
    );
  }
  return db;
};
