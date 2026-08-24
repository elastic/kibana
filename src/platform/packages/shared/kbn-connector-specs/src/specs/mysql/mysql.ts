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
 * (via `mysql2`) rather than HTTP. The connection pool is managed by the
 * framework's client lease pool via `ctx.getClient('mysql')`, which handles
 * lifecycle (eviction on connector update/delete, TTL-based eviction) and
 * enforces `xpack.actions.allowedHosts` before the first connection.
 *
 * Username and password are declared under `auth: { types: ['basic'] }`
 * rather than `schema` so they are encrypted at rest. The `MysqlClientTypeSpec`
 * in `lib/clients/mysql.ts` decodes them from the Authorization header that
 * the framework's credential accessor produces.
 *
 * Read actions (`query`, `listDatabases`, `listTables`, `describeTable`,
 * `searchRows`) are enforced as read-only via `assertReadOnly`. `executeSql`
 * is unrestricted and carries `scope: 'destroy'`.
 * `query` wraps SELECT/WITH inside a bounded subquery to enforce `maxRows`
 * server-side; SHOW/DESCRIBE/EXPLAIN are run directly (they cannot appear
 * inside a derived table).
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, escapeLikePattern } from '../../lib/generic_db_connector';
import {
  type DescribeTableInput,
  DescribeTableInputSchema,
  type ExecuteSqlInput,
  ExecuteSqlInputSchema,
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
        'Query tables, search rows, explore schema, and execute SQL in a MySQL database',
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
      port: z
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
          widget: 'number',
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
      scope: 'read',
      description:
        'Execute a read-only SQL SELECT query against the MySQL database. Only SELECT and WITH statements are permitted; SHOW, DESCRIBE, INSERT, UPDATE, DELETE, and DDL are blocked. Returns up to maxRows rows (default 100). Use listTables first to discover available tables, and describeTable to inspect column names before writing queries. Prefer WHERE clauses and explicit column lists to keep result size manageable.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        assertReadOnly(input.sql);
        // maxRows is a schema-validated integer — safe to inline directly.
        // Avoid LIMIT ? binding: user SQL may contain '?' in string literals, causing
        // a param-count mismatch in MySQL's binary prepared-statement protocol.
        const maxRows = input.maxRows ?? 100;
        const pool = await ctx.getClient('mysql');
        const [rows] = await pool.execute(
          `SELECT * FROM (\n${input.sql}\n) AS _q LIMIT ${maxRows}`
        );
        return rows as unknown[];
      },
    },

    listDatabases: {
      isTool: true,
      scope: 'read',
      description:
        'List all databases available on the connected MySQL server. Use this first to discover what databases are accessible before querying tables.',
      input: ListDatabasesInputSchema,
      handler: async (ctx) => {
        const pool = await ctx.getClient('mysql');
        const [rows] = await pool.execute('SHOW DATABASES');
        return rows as unknown[];
      },
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List all tables in a MySQL database. Specify database to target a specific database, or omit to use the configured default. Use describeTable to inspect column names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const db = resolveDatabase(input.database, ctx);
        const pool = await ctx.getClient('mysql');
        const [rows] = await pool.execute(`SHOW TABLES FROM ${quoteIdentifier(db)}`);
        return rows as unknown[];
      },
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe the structure of a MySQL table — returns column names, data types, nullability, and default values. Use this before query or searchRows to discover available columns and build correct queries.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const db = resolveDatabase(input.database, ctx);
        const pool = await ctx.getClient('mysql');
        const [rows] = await pool.execute(
          `DESCRIBE ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}`
        );
        return rows as unknown[];
      },
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in a MySQL table by matching a text value against one or more columns using LIKE pattern matching (case-insensitive partial match). Returns up to maxRows results (default 100). Use describeTable first to discover searchable column names. Prefer query (SQL SELECT) for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const db = resolveDatabase(input.database, ctx);
        const likeParam = `%${escapeLikePattern(input.searchTerm, false)}%`;
        const whereClause = input.columns
          .map((col) => `${quoteIdentifier(col)} LIKE ? ESCAPE '!'`)
          .join(' OR ');
        const maxRows = input.maxRows ?? 100;
        const sql =
          `SELECT * FROM ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}` +
          ` WHERE ${whereClause} LIMIT ${maxRows}`;
        const params = input.columns.map(() => likeParam);
        const pool = await ctx.getClient('mysql');
        const [rows] = await pool.execute(sql, params as never[]);
        return rows as unknown[];
      },
    },

    executeSql: {
      isTool: true,
      scope: 'destroy',
      description:
        'Execute any SQL statement against the MySQL database. No restrictions — INSERT, UPDATE, DELETE, DROP, and DDL are all permitted. Use only when the workflow explicitly requires a write or destructive operation. Prefer query for read-only access.',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) => {
        const pool = await ctx.getClient('mysql');
        const [result] = await pool.execute(input.sql);
        return result as unknown;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.test.description', {
      defaultMessage: 'Verifies MySQL connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      const pool = await ctx.getClient('mysql');
      await pool.execute('SELECT 1');
      return { message: 'Successfully connected to MySQL' };
    },
  },

  skill: [
    '## MySQL Connector',
    '',
    'Access to a MySQL database. Read actions (`query`, `searchRows`, `listDatabases`, `listTables`, `describeTable`) are read-only and safe to call freely. `executeSql` is unrestricted — use it only when a write or destructive operation is explicitly required.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listDatabases` — see what databases are accessible.',
    '2. `listTables` — list tables in a database (defaults to the configured database if omitted).',
    '3. `describeTable` — inspect column names, types, and nullability before writing a query.',
    '4. `query` or `searchRows` — read the data.',
    '',
    '### Choosing between `query`, `searchRows`, and `executeSql`',
    '- Prefer `query` for structured filtering, joins, aggregation, or anything expressible as a SELECT.',
    '- Prefer `searchRows` for broad, unstructured text lookups across a known set of columns.',
    '- Use `executeSql` only for writes or DDL that the workflow explicitly requires (INSERT, UPDATE, DELETE, CREATE, DROP, etc.).',
    '- Use `listDatabases`, `listTables`, and `describeTable` for schema exploration.',
    '',
    '### Gotchas',
    '- `query` only allows SELECT and WITH — multi-statement and write SQL are rejected; use `executeSql` for writes.',
    '- `query` and `searchRows` cap results at `maxRows` (default 100, max 1000) — narrow with WHERE clauses rather than relying on a large `maxRows`.',
    '- Database and table names are case-sensitive on case-sensitive filesystems (the common case on Linux). Use the exact casing returned by `listDatabases` / `listTables`.',
  ].join('\n'),
};

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
