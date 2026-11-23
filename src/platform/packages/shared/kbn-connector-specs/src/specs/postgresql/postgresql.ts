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
 * Connects directly to a PostgreSQL database over the native wire protocol (via `pg`) rather than
 * HTTP. The connection pool is managed by the framework's client lease pool via
 * `ctx.getClient('postgresql')`, which handles lifecycle (eviction on connector update/delete,
 * TTL-based eviction) and enforces `xpack.actions.allowedHosts` before the first connection.
 *
 * Username and password are declared under `auth: { types: ['basic'] }` rather than `schema` so
 * they are encrypted at rest. `postgresqlClientType` in `lib/clients/postgresql.ts` decodes them
 * from the Authorization header that the framework's credential accessor produces.
 *
 * Every read action runs inside a `BEGIN READ ONLY` transaction that is always rolled back, so the
 * server itself refuses writes. `query` adds two more layers: a best-effort client-side guard
 * (`assertReadOnly`) and a wrapper (`SELECT * FROM (<sql>) LIMIT $1`) that bounds the result and, because
 * it is sent with a bound parameter, makes the server reject multi-statement input. Least-privilege
 * database credentials remain the real control. A PostgreSQL connection is bound to one database, so
 * every action targets the configured database. `executeSql` is unrestricted and carries
 * `scope: 'destroy'`.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { QueryResult } from 'pg';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { getResponseLimit } from '../../lib/clients/postgresql_response_limit';
import {
  assertReadOnly,
  escapeLikePattern,
  SELECT_OR_WITH_PREFIX,
} from '../../lib/generic_db_connector';
import {
  type DescribeTableInput,
  DescribeTableInputSchema,
  type ExecuteSqlInput,
  ExecuteSqlInputSchema,
  type GetSchemaInput,
  GetSchemaInputSchema,
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
// getSchema returns one row per column, so it needs a larger cap.
const MAX_SCHEMA_COLUMNS = 2000;
const DEFAULT_SCHEMA = 'public';

// Fallback for xpack.actions.maxResponseContentLength when the client did not record one.
const DEFAULT_MAX_CONTENT_LENGTH = 1024 * 1024;

type Row = Record<string, unknown>;

interface SqlResult<T extends Row = Row> {
  rows: T[];
  rowCount: number;
  truncated: boolean;
}

const isIdentifierChar = (char: string | undefined): boolean =>
  char !== undefined && /[A-Za-z0-9_$\u0080-￿]/.test(char);

const DOLLAR_QUOTE_TAG = /^\$(?:[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/;

// Blanks comments, literals and quoted identifiers (keeping length) so the read-only scan sees only SQL tokens.
const blankNonCode = (sql: string): string => {
  const out: string[] = [];
  const blank = (from: number, to: number) => {
    const end = Math.min(to, sql.length);
    for (let k = from; k < end; k++) {
      out.push(sql[k] === '\n' ? '\n' : ' ');
    }
    return end;
  };

  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === '-' && next === '-') {
      const newline = sql.indexOf('\n', i);
      i = blank(i, newline === -1 ? sql.length : newline);
    } else if (char === '/' && next === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') {
          depth++;
          j += 2;
        } else if (sql[j] === '*' && sql[j + 1] === '/') {
          depth--;
          j += 2;
        } else {
          j++;
        }
      }
      i = blank(i, j);
    } else if (char === "'" || char === '"') {
      // E'...' strings treat backslash as an escape; plain strings and quoted identifiers do not.
      const backslashEscapes =
        char === "'" && /[eE]/.test(sql[i - 1] ?? '') && !isIdentifierChar(sql[i - 2]);
      let j = i + 1;
      while (j < sql.length) {
        if (backslashEscapes && sql[j] === '\\') {
          j += 2;
        } else if (sql[j] === char && sql[j + 1] === char) {
          j += 2; // a doubled delimiter is an escaped delimiter ('' "")
        } else if (sql[j] === char) {
          j++;
          break;
        } else {
          j++;
        }
      }
      i = blank(i, j);
    } else if (char === '$' && !isIdentifierChar(sql[i - 1])) {
      const tag = DOLLAR_QUOTE_TAG.exec(sql.slice(i))?.[0];
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        i = blank(i, close === -1 ? sql.length : close + tag.length);
      } else {
        out.push(char);
        i++;
      }
    } else {
      out.push(char);
      i++;
    }
  }
  return out.join('');
};

// Drops rows beyond maxRows or the maximum response size and flags the result as truncated.
const capRows = <T extends Row>(
  rows: T[],
  maxRows: number,
  maxBytes: number
): { rows: T[]; truncated: boolean } => {
  const kept: T[] = [];
  let retainedBytes = 0;
  let truncated = rows.length > maxRows;
  for (const row of rows.slice(0, maxRows)) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row), 'utf8');
    if (retainedBytes + rowBytes > maxBytes) {
      truncated = true;
      break;
    }
    kept.push(row);
    retainedBytes += rowBytes;
  }
  return { rows: kept, truncated };
};

/** Runs one statement in a `BEGIN READ ONLY` transaction that is always rolled back. */
const runReadOnly = async <T extends Row = Row>(
  ctx: ActionContext,
  text: string,
  values: unknown[] = [],
  maxRows: number = DEFAULT_MAX_ROWS
): Promise<SqlResult<T>> => {
  const pool = await ctx.getClient('postgresql');
  const maxContentLength = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
  const client = await pool.connect();
  let discard = false;
  // pg-pool drops its own error listener while a client is checked out; without one a connection error is thrown.
  const onClientError = (err: Error) => {
    discard = true;
    ctx.log.warn(`[postgresql] Connection error during query: ${err.message}`);
  };
  client.on('error', onClientError);
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query<T>({ text, values });
    const { rows, truncated } = capRows(result.rows, maxRows, maxContentLength);
    return { rows, rowCount: rows.length, truncated };
  } finally {
    // A connection that cannot roll back is in an unknown state; destroy it rather than return it to the pool.
    await client.query('ROLLBACK').catch(() => {
      discard = true;
    });
    client.removeListener('error', onClientError);
    client.release(discard);
  }
};

// Quotes a PostgreSQL identifier as "name", doubling any embedded double quote.
const quoteIdentifier = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

const resolveMaxRows = (maxRows?: number): number => maxRows ?? DEFAULT_MAX_ROWS;

// Relation kinds an agent can select from: tables, partitioned tables, views, materialized views, foreign tables.
const QUERYABLE_RELKINDS = `('r', 'p', 'v', 'm', 'f')`;
const RELKIND_LABEL = `CASE c.relkind
  WHEN 'r' THEN 'TABLE' WHEN 'p' THEN 'PARTITIONED TABLE' WHEN 'v' THEN 'VIEW'
  WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'f' THEN 'FOREIGN TABLE' END`;

// Wraps `query` so the row limit is a bound parameter, which makes the server reject multi-statement input.
const wrapQuery = (sql: string, code: string): string => {
  // assertReadOnly already guaranteed that only whitespace or comments follow the first semicolon.
  const semicolon = code.indexOf(';');
  const statement = semicolon === -1 ? sql : sql.slice(0, semicolon);
  return `SELECT * FROM (\n${statement}\n) AS kibana_query LIMIT $1`;
};

export const PostgresqlConnector: ConnectorSpec = {
  metadata: {
    id: '.postgresql',
    displayName: 'PostgreSQL',
    description: i18n.translate('connectorSpecs.postgresql.metadata.description', {
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
          i18n.translate('connectorSpecs.postgresql.config.host.description', {
            defaultMessage: 'The PostgreSQL server hostname or IP address',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.postgresql.config.host.label', {
            defaultMessage: 'Host',
          }),
          placeholder: 'postgres.example.com',
          helpText: i18n.translate('connectorSpecs.postgresql.config.host.helpText', {
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
          i18n.translate('connectorSpecs.postgresql.config.port.description', {
            defaultMessage: 'The PostgreSQL server port',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('connectorSpecs.postgresql.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '5432',
          helpText: i18n.translate('connectorSpecs.postgresql.config.port.helpText', {
            defaultMessage: 'The port number of the PostgreSQL server (default: 5432)',
          }),
        }),
      database: z
        .string()
        .min(1)
        .max(63)
        .describe(
          i18n.translate('connectorSpecs.postgresql.config.database.description', {
            defaultMessage: 'The database to connect to',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.postgresql.config.database.label', {
            defaultMessage: 'Database',
          }),
          placeholder: 'my_database',
          helpText: i18n.translate('connectorSpecs.postgresql.config.database.helpText', {
            defaultMessage:
              'The name of the database to query. PostgreSQL cannot switch databases within a connection, so create one connector per database.',
          }),
        }),
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('connectorSpecs.postgresql.config.ssl.description', {
            defaultMessage: 'Whether to use TLS when connecting to PostgreSQL',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.postgresql.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('connectorSpecs.postgresql.config.ssl.helpText', {
            defaultMessage:
              'Required (default) encrypts the connection using Kibana TLS settings, including managed services such as Amazon RDS. Disable only for servers that do not support TLS.',
          }),
        }),
    })
  ),

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Execute a read-only SQL SELECT query against the PostgreSQL database. Only SELECT and WITH statements are permitted; INSERT, UPDATE, DELETE, SELECT INTO, COPY, and DDL are blocked, and the query runs in a read-only transaction, which blocks data changes only, not functions with other side effects such as pg_sleep or advisory locks. Results are capped at maxRows (default 100, max 1000) and at the maximum response size, and flagged as truncated when more rows exist, so a LIMIT clause is optional. Do not include a trailing semicolon. Use listTables first to discover tables, and describeTable to inspect column names before writing queries. Quote mixed-case identifiers with double quotes (e.g. "Orders") and qualify tables outside the public schema (e.g. sales.orders).',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const code = blankNonCode(input.sql);
        assertReadOnly(code, SELECT_OR_WITH_PREFIX);
        const maxRows = resolveMaxRows(input.maxRows);
        return runReadOnly(ctx, wrapQuery(input.sql, code), [maxRows + 1], maxRows);
      },
    },

    listDatabases: {
      isTool: true,
      scope: 'read',
      description:
        'List the databases on the connected PostgreSQL server, with owner, encoding, and whether the authenticated user can connect. Each connector targets a single database, so use this to confirm the connected database name or to find other databases that need their own connector.',
      input: ListDatabasesInputSchema,
      handler: async (ctx) =>
        runReadOnly(
          ctx,
          `SELECT datname AS "name", pg_catalog.pg_get_userbyid(datdba) AS "owner",
            pg_catalog.pg_encoding_to_char(encoding) AS "encoding",
            pg_catalog.has_database_privilege(datname, 'CONNECT') AS "canConnect"
          FROM pg_catalog.pg_database
          WHERE NOT datistemplate
          ORDER BY datname
          LIMIT ${MAX_MAX_ROWS + 1}`,
          [],
          MAX_MAX_ROWS
        ),
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List the tables, views, materialized views, and foreign tables readable by the authenticated user in the connected PostgreSQL database, with their schema and type. Pass schema to narrow the list. System schemas are excluded. Use describeTable to inspect column names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) =>
        runReadOnly(
          ctx,
          `SELECT n.nspname AS "schema", c.relname AS "name", ${RELKIND_LABEL} AS "type",
            pg_catalog.obj_description(c.oid, 'pg_class') AS "comment"
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ${QUERYABLE_RELKINDS}
            AND NOT c.relispartition
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND n.nspname !~ '^pg_(toast|temp)'
            AND pg_catalog.has_table_privilege(c.oid, 'SELECT')
            AND ($1::text IS NULL OR n.nspname = $1::text)
          ORDER BY n.nspname, c.relname
          LIMIT ${MAX_MAX_ROWS + 1}`,
          [input.schema ?? null],
          MAX_MAX_ROWS
        ),
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a PostgreSQL table or view: returns columns (name, data type, nullability, default), constraints (primary key, unique, foreign key with the table and columns it references, check), and indexes. Use this before query or searchRows to discover available columns and build correct queries.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const schema = input.schema ?? DEFAULT_SCHEMA;

        const relation = await runReadOnly<{ oid: number; type: string; comment: string | null }>(
          ctx,
          `SELECT c.oid AS "oid", ${RELKIND_LABEL} AS "type",
            pg_catalog.obj_description(c.oid, 'pg_class') AS "comment"
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ${QUERYABLE_RELKINDS}`,
          [schema, input.table],
          1
        );
        if (relation.rowCount === 0) {
          throw new Error(
            `Table or view ${schema}.${input.table} was not found. Use listTables to see available names.`
          );
        }
        const [{ oid, type, comment }] = relation.rows;

        const columns = await runReadOnly(
          ctx,
          `SELECT a.attname AS "name", a.attnum AS "position",
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS "dataType",
            NOT a.attnotnull AS "isNullable",
            pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS "defaultValue",
            pg_catalog.col_description(a.attrelid, a.attnum) AS "comment"
          FROM pg_catalog.pg_attribute a
          LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE a.attrelid = $1::oid AND a.attnum > 0 AND NOT a.attisdropped
          ORDER BY a.attnum
          LIMIT ${MAX_MAX_ROWS + 1}`,
          [oid],
          MAX_MAX_ROWS
        );

        const constraints = await runReadOnly(
          ctx,
          `SELECT con.conname AS "name",
            CASE con.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE'
              WHEN 'f' THEN 'FOREIGN KEY' WHEN 'c' THEN 'CHECK' WHEN 'x' THEN 'EXCLUDE' END AS "type",
            pg_catalog.pg_get_constraintdef(con.oid) AS "definition"
          FROM pg_catalog.pg_constraint con
          WHERE con.conrelid = $1::oid AND con.contype IN ('p', 'u', 'f', 'c', 'x')
          ORDER BY CASE con.contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'f' THEN 2 ELSE 3 END, con.conname
          LIMIT ${MAX_MAX_ROWS + 1}`,
          [oid],
          MAX_MAX_ROWS
        );

        const indexes = await runReadOnly(
          ctx,
          `SELECT ic.relname AS "name", i.indisunique AS "isUnique", i.indisprimary AS "isPrimary",
            pg_catalog.pg_get_indexdef(i.indexrelid) AS "definition"
          FROM pg_catalog.pg_index i
          JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
          WHERE i.indrelid = $1::oid
          ORDER BY ic.relname
          LIMIT ${MAX_MAX_ROWS + 1}`,
          [oid],
          MAX_MAX_ROWS
        );

        return {
          schema,
          table: input.table,
          type,
          comment,
          columns: columns.rows,
          constraints: constraints.rows,
          indexes: indexes.rows,
        };
      },
    },

    getSchema: {
      isTool: true,
      scope: 'read',
      description:
        'Get an overview of a PostgreSQL schema in one call: every table and view readable by the authenticated user, with each one\'s columns (name, data type, nullability, whether it is part of the primary key). Defaults to the "public" schema. When the schema is too large the result is flagged truncated and the last table is left out, so it may be incomplete; use describeTable for the missing tables. Use this to orient yourself in an unfamiliar database or to plan joins; use describeTable for one table\'s constraints and indexes.',
      input: GetSchemaInputSchema,
      handler: async (ctx, input: GetSchemaInput) => {
        const schema = input.schema ?? DEFAULT_SCHEMA;
        const result = await runReadOnly<{
          table: string;
          type: string;
          column: string;
          dataType: string;
          isNullable: boolean;
          isPrimaryKey: boolean;
        }>(
          ctx,
          `SELECT c.relname AS "table", ${RELKIND_LABEL} AS "type", a.attname AS "column",
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS "dataType",
            NOT a.attnotnull AS "isNullable",
            EXISTS (
              SELECT 1 FROM pg_catalog.pg_constraint k
              WHERE k.conrelid = c.oid AND k.contype = 'p' AND a.attnum = ANY (k.conkey)
            ) AS "isPrimaryKey"
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_catalog.pg_attribute a
            ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
          WHERE n.nspname = $1 AND c.relkind IN ${QUERYABLE_RELKINDS}
            AND NOT c.relispartition
            AND pg_catalog.has_table_privilege(c.oid, 'SELECT')
          ORDER BY c.relname, a.attnum
          LIMIT ${MAX_SCHEMA_COLUMNS + 1}`,
          [schema],
          MAX_SCHEMA_COLUMNS
        );

        const tables = new Map<
          string,
          {
            name: string;
            type: string;
            columns: Array<{
              name: string;
              dataType: string;
              isNullable: boolean;
              isPrimaryKey: boolean;
            }>;
          }
        >();
        for (const { table, type, column, dataType, isNullable, isPrimaryKey } of result.rows) {
          const entry = tables.get(table) ?? { name: table, type, columns: [] };
          entry.columns.push({ name: column, dataType, isNullable, isPrimaryKey });
          tables.set(table, entry);
        }
        if (result.rowCount === 0) {
          throw new Error(
            `Schema ${schema} was not found or has no readable tables. Use listTables to see available schemas.`
          );
        }
        const schemaTables = Array.from(tables.values());
        if (result.truncated) schemaTables.pop();
        return { schema, tables: schemaTables, truncated: result.truncated };
      },
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in a PostgreSQL table by matching a text value against one or more columns using ILIKE (case-insensitive partial match; non-text columns are compared on their text representation). Returns up to maxRows results (default 100). Use describeTable first to discover searchable column names. Prefer query (SQL SELECT) for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const schema = input.schema ?? DEFAULT_SCHEMA;
        const maxRows = resolveMaxRows(input.maxRows);
        const conditions = input.columns
          .map((column) => `${quoteIdentifier(column)}::text ILIKE $1 ESCAPE '!'`)
          .join(' OR ');
        const sql =
          `SELECT * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(input.table)}` +
          ` WHERE ${conditions} LIMIT $2`;
        return runReadOnly(
          ctx,
          sql,
          [`%${escapeLikePattern(input.searchTerm, false)}%`, maxRows + 1],
          maxRows
        );
      },
    },

    executeSql: {
      isTool: false,
      scope: 'destroy',
      description:
        'Execute any SQL against the PostgreSQL database. No restrictions — INSERT, UPDATE, DELETE, DROP, COPY, and DDL are all permitted, and several statements may be sent at once (they run in a single implicit transaction). Use only when the workflow explicitly requires a write or destructive operation. Prefer query for read-only access. Returns one result per statement with its command tag and affected row count; at most the first 1000 rows of each are returned (truncated is true when more were produced).',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) => {
        const pool = await ctx.getClient('postgresql');
        const maxContentLength = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
        // A multi-statement string yields one result per statement at runtime, which the driver types as one.
        const outcome: QueryResult | QueryResult[] = await pool.query(input.sql);
        const results = Array.isArray(outcome) ? outcome : [outcome];
        return {
          results: results.map(({ command, rowCount, rows }) => ({
            command,
            rowCount,
            ...capRows(rows, MAX_MAX_ROWS, maxContentLength),
          })),
        };
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.postgresql.test.description', {
      defaultMessage: 'Verifies the PostgreSQL connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await runReadOnly(ctx, 'SELECT 1 AS ok', [], 1);
      return { message: 'Successfully connected to PostgreSQL' };
    },
  },

  skill: [
    '## PostgreSQL Connector',
    '',
    'Access to a single PostgreSQL database. Read actions (`query`, `searchRows`, `listDatabases`, `listTables`, `describeTable`, `getSchema`) run in read-only transactions and are safe to call freely. `executeSql` is unrestricted — use it only when a write or destructive operation is explicitly required.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listTables` — list tables and views with their schema (usually `public`).',
    '2. `getSchema` — see every table in a schema with its columns in one call, or `describeTable` for one table (columns, constraints, foreign keys, indexes). Pass `schema` if the table is not in `public`.',
    '3. `query` or `searchRows` — read the data.',
    '',
    '### Choosing between `query`, `searchRows`, and `executeSql`',
    '- Prefer `query` for structured filtering, joins, aggregation, or anything expressible as a SELECT.',
    '- Prefer `searchRows` for broad text lookups across a known set of columns.',
    '- Use `executeSql` only for writes or DDL that the workflow explicitly requires.',
    '- Do not send `information_schema` or `pg_catalog` lookups to `query` when `listTables`, `getSchema`, or `describeTable` answers the question.',
    '',
    '### Gotchas',
    '- Unquoted identifiers are folded to lower case. A table created as `"Orders"` must be written `"Orders"` in `query` SQL; use the exact casing returned by `listTables`. Action inputs such as `table` and `columns` take the exact name without quotes.',
    '- Tables outside the `public` schema must be schema-qualified in `query` SQL (for example `sales.orders`).',
    '- `query` only allows SELECT and WITH — multi-statement SQL and write SQL are rejected; use `executeSql` for writes. Do not add a trailing semicolon.',
    '- Results are capped at `maxRows` (default 100, max 1000) and at the maximum response size, so very wide rows can truncate earlier. When `truncated` is true, narrow the query with a WHERE clause or aggregate instead of raising `maxRows`.',
    '- Give every output column a distinct name (`SELECT a.id AS a_id, b.id AS b_id`); duplicate names collapse into one key.',
    '- `bigint` and `numeric` values are returned as strings to avoid losing precision. Avoid selecting `bytea` columns.',
    '- Cross-database queries are not supported. Each connector targets one database.',
    '- TLS is required by default. Set TLS to disabled only when the server does not support TLS.',
  ].join('\n'),
};
