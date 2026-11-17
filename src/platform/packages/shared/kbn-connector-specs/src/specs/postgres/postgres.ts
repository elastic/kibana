/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * PostgreSQL Connector
 *
 * Connects directly to a PostgreSQL database over the native PostgreSQL wire
 * protocol (via `pg`) rather than HTTP. The connection pool is managed by the
 * framework's client lease pool via `ctx.getClient('postgres')`, which handles
 * lifecycle (eviction on connector update/delete, TTL-based eviction) and
 * enforces `xpack.actions.allowedHosts` before the first connection.
 *
 * Username and password are declared under `auth: { types: ['basic'] }`
 * rather than `schema` so they are encrypted at rest. The `postgresClientType`
 * in `lib/clients/postgres.ts` decodes them from the Authorization header that
 * the framework's credential accessor produces.
 *
 * A PostgreSQL connection is bound to a single database, so unlike MySQL there is
 * no per-action `database` input: discovery goes through schemas instead
 * (`listSchemas`, `listTables`, `describeTable`).
 *
 * `query` and `searchRows` run inside a `BEGIN READ ONLY` transaction, so the
 * server itself rejects writes in addition to the `assertReadOnly` text guard.
 * `executeSql` is unrestricted and carries `scope: 'destroy'`.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { PoolClient, QueryResult } from 'pg';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, escapeLikePattern } from '../../lib/generic_db_connector';
import {
  type DescribeTableInput,
  DescribeTableInputSchema,
  type ExecuteSqlInput,
  ExecuteSqlInputSchema,
  IDENTIFIER_MAX_BYTES,
  ListSchemasInputSchema,
  type ListTablesInput,
  ListTablesInputSchema,
  type QueryInput,
  QueryInputSchema,
  type SearchRowsInput,
  SearchRowsInputSchema,
} from './types';

const DEFAULT_SCHEMA = 'public';
const DEFAULT_MAX_ROWS = 100;
const MAX_MAX_ROWS = 1000;

type Row = Record<string, unknown>;

const quoteIdentifier = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

const resolveMaxRows = (maxRows?: number): number => {
  if (maxRows === undefined) {
    return DEFAULT_MAX_ROWS;
  }
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > MAX_MAX_ROWS) {
    throw new Error(`maxRows must be an integer between 1 and ${MAX_MAX_ROWS}`);
  }
  return maxRows;
};

const rollbackQuietly = async (client: PoolClient): Promise<Error | undefined> => {
  try {
    await client.query('ROLLBACK');
    return undefined;
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
};

// Runs a statement in a READ ONLY transaction that is always rolled back.
const runReadOnly = async (
  ctx: ActionContext,
  sql: string,
  params?: readonly string[]
): Promise<Row[]> => {
  const pool = await ctx.getClient('postgres');
  const client = await pool.connect();
  let rollbackError: Error | undefined;
  try {
    await client.query('BEGIN READ ONLY');
    const result = params
      ? await client.query<Row>(sql, [...params])
      : await client.query<Row>(sql);
    return result.rows;
  } finally {
    rollbackError = await rollbackQuietly(client);
    // Passing an error discards the connection instead of returning a broken one to the pool.
    client.release(rollbackError);
  }
};

const summarize = ({ command, rowCount, rows }: QueryResult<Row>) => ({
  command,
  rowCount,
  rows,
});

// The simple query protocol returns one result per statement when the SQL holds several.
const runSql = async (ctx: ActionContext, sql: string): Promise<unknown> => {
  const pool = await ctx.getClient('postgres');
  const result: QueryResult<Row> | Array<QueryResult<Row>> = await pool.query<Row>(sql);
  return Array.isArray(result) ? result.map(summarize) : summarize(result);
};

export const PostgresConnector: ConnectorSpec = {
  metadata: {
    id: '.postgres',
    displayName: 'PostgreSQL',
    description: i18n.translate('connectorSpecs.postgres.metadata.description', {
      defaultMessage:
        'Query tables, search rows, explore schema, and execute SQL in a PostgreSQL database',
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
          i18n.translate('connectorSpecs.postgres.config.host.description', {
            defaultMessage: 'The PostgreSQL server hostname or IP address',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.postgres.config.host.label', {
            defaultMessage: 'Host',
          }),
          placeholder: 'postgres.example.com',
          helpText: i18n.translate('connectorSpecs.postgres.config.host.helpText', {
            defaultMessage:
              'The hostname or IP address of the PostgreSQL server (no protocol prefix).',
          }),
        }),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(5432)
        .describe(
          i18n.translate('connectorSpecs.postgres.config.port.description', {
            defaultMessage: 'The PostgreSQL server port',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('connectorSpecs.postgres.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '5432',
          helpText: i18n.translate('connectorSpecs.postgres.config.port.helpText', {
            defaultMessage: 'The port number of the PostgreSQL server (default: 5432)',
          }),
        }),
      database: z
        .string()
        .min(1)
        .max(IDENTIFIER_MAX_BYTES)
        .refine((value) => Buffer.byteLength(value, 'utf8') <= IDENTIFIER_MAX_BYTES, {
          message: `Database names are limited to ${IDENTIFIER_MAX_BYTES} bytes`,
        })
        .describe(
          i18n.translate('connectorSpecs.postgres.config.database.description', {
            defaultMessage: 'The database to connect to',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.postgres.config.database.label', {
            defaultMessage: 'Database',
          }),
          placeholder: 'my_database',
          helpText: i18n.translate('connectorSpecs.postgres.config.database.helpText', {
            defaultMessage:
              'The name of the database to query. The connector can only access this one database.',
          }),
        }),
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('connectorSpecs.postgres.config.ssl.description', {
            defaultMessage: 'Whether to use TLS when connecting to PostgreSQL',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.postgres.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('connectorSpecs.postgres.config.ssl.helpText', {
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
        'Execute a read-only SQL SELECT query against the PostgreSQL database. Only SELECT and WITH statements are permitted; SHOW, EXPLAIN, INSERT, UPDATE, DELETE, and DDL are blocked, and the statement runs in a read-only transaction. Include a LIMIT clause to bound results (e.g. LIMIT 100). Do not include a trailing semicolon. Use listTables first to discover available tables, and describeTable to inspect column names before writing queries. Prefer WHERE clauses and explicit column lists to keep result size manageable. Returns an array of row objects.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        assertReadOnly(input.sql);
        return runReadOnly(ctx, input.sql);
      },
    },

    listSchemas: {
      isTool: true,
      scope: 'read',
      description:
        'List the schemas in the connected PostgreSQL database that the user can access (system schemas excluded). Use this first to discover where tables live before calling listTables. The connector is bound to a single database, so other databases on the server are not reachable.',
      input: ListSchemasInputSchema,
      handler: async (ctx) =>
        runReadOnly(
          ctx,
          `SELECT n.nspname AS schema_name
           FROM pg_namespace n
           WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
             AND n.nspname NOT LIKE 'pg\\_toast%'
             AND n.nspname NOT LIKE 'pg\\_temp\\_%'
             AND has_schema_privilege(n.oid, 'USAGE')
           ORDER BY n.nspname`
        ),
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List the tables, views, materialized views, and foreign tables in a PostgreSQL schema (default "public"). Returns table_name and table_type. Use describeTable to inspect column names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) =>
        runReadOnly(
          ctx,
          `SELECT c.relname AS table_name,
                  CASE c.relkind
                    WHEN 'r' THEN 'table'
                    WHEN 'p' THEN 'partitioned table'
                    WHEN 'v' THEN 'view'
                    WHEN 'm' THEN 'materialized view'
                    WHEN 'f' THEN 'foreign table'
                  END AS table_type
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = $1
             AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
             AND NOT c.relispartition
           ORDER BY c.relname`,
          [input.schema ?? DEFAULT_SCHEMA]
        ),
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe the structure of a PostgreSQL table, view, or materialized view: for each column its name, data type, nullability, default expression, primary-key membership, and comment. Use this before query or searchRows to discover available columns and build correct queries.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const schemaName = input.schema ?? DEFAULT_SCHEMA;
        const columns = await runReadOnly(
          ctx,
          `SELECT a.attname AS column_name,
                  format_type(a.atttypid, a.atttypmod) AS data_type,
                  NOT a.attnotnull AS is_nullable,
                  pg_get_expr(d.adbin, d.adrelid) AS column_default,
                  EXISTS (
                    SELECT 1 FROM pg_constraint k
                    WHERE k.conrelid = c.oid AND k.contype = 'p' AND a.attnum = ANY (k.conkey)
                  ) AS is_primary_key,
                  col_description(a.attrelid, a.attnum) AS comment
           FROM pg_attribute a
           JOIN pg_class c ON c.oid = a.attrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
           WHERE n.nspname = $1
             AND c.relname = $2
             AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
             AND a.attnum > 0
             AND NOT a.attisdropped
           ORDER BY a.attnum`,
          [schemaName, input.table]
        );
        if (columns.length === 0) {
          throw new Error(
            `Table ${schemaName}.${input.table} was not found. Use listTables to see the available tables and their exact casing.`
          );
        }
        return columns;
      },
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in a PostgreSQL table by matching a text value against one or more columns using case-insensitive partial matching (ILIKE). Non-text columns are compared as text. Returns up to maxRows results (default 100). Use describeTable first to discover searchable column names. Prefer query (SQL SELECT) for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const likeParam = `%${escapeLikePattern(input.searchTerm, false)}%`;
        const whereClause = input.columns
          .map((col) => `${quoteIdentifier(col)}::text ILIKE $1 ESCAPE '!'`)
          .join(' OR ');
        const maxRows = resolveMaxRows(input.maxRows);
        const sql =
          `SELECT * FROM ${quoteIdentifier(input.schema ?? DEFAULT_SCHEMA)}.${quoteIdentifier(
            input.table
          )}` + ` WHERE ${whereClause} LIMIT ${maxRows}`;
        return runReadOnly(ctx, sql, [likeParam]);
      },
    },

    executeSql: {
      isTool: false,
      scope: 'destroy',
      description:
        'Execute any SQL statement against the PostgreSQL database. No restrictions — INSERT, UPDATE, DELETE, DROP, and DDL are all permitted. Use only when the workflow explicitly requires a write or destructive operation. Prefer query for read-only access. Returns the command tag, affected row count, and any returned rows (an array of these, one per statement, when the SQL contains several statements).',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) => runSql(ctx, input.sql),
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.postgres.test.description', {
      defaultMessage: 'Verifies PostgreSQL connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      const pool = await ctx.getClient('postgres');
      await pool.query('SELECT 1');
      return { message: 'Successfully connected to PostgreSQL' };
    },
  },

  skill: [
    '## PostgreSQL Connector',
    '',
    'Access to one PostgreSQL database. Read actions (`query`, `searchRows`, `listSchemas`, `listTables`, `describeTable`) run in read-only transactions and are safe to call freely. `executeSql` is unrestricted — use it only when a write or destructive operation is explicitly required.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listSchemas` — see which schemas are accessible (tables usually live in `public`).',
    '2. `listTables` — list tables and views in a schema (defaults to `public` if omitted).',
    '3. `describeTable` — inspect column names, types, nullability, and primary keys before writing a query.',
    '4. `query` or `searchRows` — read the data.',
    '',
    '### Choosing between `query`, `searchRows`, and `executeSql`',
    '- Prefer `query` for structured filtering, joins, aggregation, or anything expressible as a SELECT.',
    '- Prefer `searchRows` for broad, unstructured text lookups across a known set of columns.',
    '- Use `executeSql` only for writes or DDL that the workflow explicitly requires (INSERT, UPDATE, DELETE, CREATE, DROP, etc.).',
    '- Use `listSchemas`, `listTables`, and `describeTable` for schema exploration. Do not send SHOW or EXPLAIN to `query`.',
    '',
    '### Gotchas',
    '- The connector reaches a single database. Cross-database queries are not possible in PostgreSQL; use schema-qualified names (`sales.orders`) instead.',
    '- `query` only allows SELECT and WITH — multi-statement and write SQL are rejected; use `executeSql` for writes.',
    '- Include a `LIMIT` clause in `query` SQL (e.g. `LIMIT 100`) — an unbounded SELECT can return a very large result set.',
    '- Identifiers are folded to lower case unless double-quoted. Quote mixed-case names (`"Orders"`) and use the exact casing returned by `listTables`.',
    '- `searchRows` caps results at `maxRows` (default 100, max 1000) — narrow with additional columns or a more specific search term rather than relying on a large `maxRows`.',
    '- `bigint` and `numeric` values come back as strings to avoid losing precision.',
    '- TLS is required by default. Set TLS to disabled only when the PostgreSQL server does not support TLS.',
  ].join('\n'),
};
