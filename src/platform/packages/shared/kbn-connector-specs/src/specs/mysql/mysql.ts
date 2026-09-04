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
 * `query` accepts SELECT/WITH only (enforced by `assertReadOnly`) and runs the
 * statement as-is; include a `LIMIT` in the SQL to bound the result size.
 * Use `listDatabases`, `listTables`, and `describeTable` for SHOW/DESCRIBE.
 * `executeSql` is unrestricted and carries `scope: 'destroy'`.
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

const DEFAULT_MAX_ROWS = 100;
const MAX_MAX_ROWS = 1000;

const resolveMaxRows = (maxRows?: number): number => {
  if (maxRows === undefined) {
    return DEFAULT_MAX_ROWS;
  }
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > MAX_MAX_ROWS) {
    throw new Error(`maxRows must be an integer between 1 and ${MAX_MAX_ROWS}`);
  }
  return maxRows;
};

const runSql = async (
  ctx: ActionContext,
  sql: string,
  params?: readonly string[]
): Promise<unknown> => {
  const pool = await ctx.getClient('mysql');
  const [rows] = params ? await pool.execute(sql, [...params]) : await pool.query(sql);
  return rows;
};

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
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['basic'],
  },

  schema: lazySchema(() =>
    z.object({
      host: z
        .string()
        .min(1)
        .max(253)
        .refine((value) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(value), {
          message: 'Host must be a hostname or IP address, without a protocol prefix',
        })
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
        .default(3306)
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
        .max(64)
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
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.mysql.config.ssl.description', {
            defaultMessage: 'Whether to use TLS when connecting to MySQL',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('core.kibanaConnectorSpecs.mysql.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.mysql.config.ssl.helpText', {
            defaultMessage:
              'Required (default) encrypts the connection using Kibana TLS settings. Disable only for servers that do not support TLS.',
          }),
        }),
    })
  ),

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Execute a read-only SQL SELECT query against the MySQL database. Only SELECT and WITH statements are permitted; SHOW, DESCRIBE, INSERT, UPDATE, DELETE, and DDL are blocked. Include a LIMIT clause to bound results (e.g. LIMIT 100). Do not include a trailing semicolon. Use listTables first to discover available tables, and describeTable to inspect column names before writing queries. Prefer WHERE clauses and explicit column lists to keep result size manageable.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        assertReadOnly(input.sql);
        return runSql(ctx, input.sql);
      },
    },

    listDatabases: {
      isTool: true,
      scope: 'read',
      description:
        'List all databases available on the connected MySQL server. Use this first to discover what databases are accessible before querying tables.',
      input: ListDatabasesInputSchema,
      handler: async (ctx) => runSql(ctx, 'SHOW DATABASES'),
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List all tables in a MySQL database. Specify database to target a specific database, or omit to use the configured default. Use describeTable to inspect column names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const db = resolveDatabase(input.database, ctx);
        return runSql(ctx, `SHOW TABLES FROM ${quoteIdentifier(db)}`);
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
        return runSql(ctx, `DESCRIBE ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}`);
      },
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in a MySQL table by matching a text value against one or more columns using LIKE pattern matching (case-insensitive partial match via LOWER). Returns up to maxRows results (default 100). Use describeTable first to discover searchable column names. Prefer query (SQL SELECT) for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const db = resolveDatabase(input.database, ctx);
        const likeParam = `%${escapeLikePattern(input.searchTerm.toLowerCase(), false)}%`;
        const whereClause = input.columns
          .map((col) => `LOWER(${quoteIdentifier(col)}) LIKE ? ESCAPE '!'`)
          .join(' OR ');
        const maxRows = resolveMaxRows(input.maxRows);
        const sql =
          `SELECT * FROM ${quoteIdentifier(db)}.${quoteIdentifier(input.table)}` +
          ` WHERE ${whereClause} LIMIT ${maxRows}`;
        return runSql(
          ctx,
          sql,
          input.columns.map(() => likeParam)
        );
      },
    },

    executeSql: {
      isTool: true,
      scope: 'destroy',
      description:
        'Execute any SQL statement against the MySQL database. No restrictions — INSERT, UPDATE, DELETE, DROP, and DDL are all permitted. Use only when the workflow explicitly requires a write or destructive operation. Prefer query for read-only access.',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) => runSql(ctx, input.sql),
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mysql.test.description', {
      defaultMessage: 'Verifies MySQL connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await runSql(ctx, 'SELECT 1');
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
    '- Use `listDatabases`, `listTables`, and `describeTable` for schema exploration. Do not send SHOW or DESCRIBE to `query`.',
    '',
    '### Gotchas',
    '- `query` only allows SELECT and WITH — multi-statement and write SQL are rejected; use `executeSql` for writes.',
    '- Include a `LIMIT` clause in `query` SQL (e.g. `LIMIT 100`) — the query runs as-is, so an unbounded SELECT can return a very large result set.',
    '- `searchRows` caps results at `maxRows` (default 100, max 1000) — narrow with additional columns or a more specific search term rather than relying on a large `maxRows`.',
    '- Database and table names are case-sensitive on case-sensitive filesystems (the common case on Linux). Use the exact casing returned by `listDatabases` / `listTables`.',
    '- TLS is required by default. Set TLS to disabled only when the MySQL server does not support TLS.',
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
