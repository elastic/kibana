/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Azure SQL Connector
 *
 * Connects directly to an Azure SQL Database over the native TDS protocol (via `mssql`,
 * which wraps `tedious`) rather than HTTP. The connection pool is managed by the framework's
 * client lease pool via `ctx.getClient('mssql')`, which handles lifecycle (eviction on
 * connector update/delete, TTL-based eviction) and enforces `xpack.actions.allowedHosts`
 * before the first connection.
 *
 * Username and password are declared under `auth: { types: ['basic'] }` rather than `schema`
 * so they are encrypted at rest. `mssqlClientType` in `lib/clients/mssql.ts` decodes them
 * from the Authorization header that the framework's credential accessor produces. Only SQL
 * authentication is supported; Microsoft Entra ID needs `getAuthHeaders` support on the
 * OAuth auth types first.
 *
 * `query` accepts SELECT/WITH only (enforced by the shared `assertReadOnly` plus a T-SQL write pattern).
 * Results are streamed and retained only up to `maxRows` and the Actions maximum response size, so an
 * unbounded SELECT cannot exhaust Kibana memory. Azure SQL Database cannot switch databases within a
 * connection, so every action targets the configured database. `executeSql` is unrestricted, carries
 * `scope: 'destroy'`, and is never cancelled to cap its output.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { getResponseLimit } from '../../lib/clients/mssql_response_limit';
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
const DEFAULT_SCHEMA = 'dbo';

// T-SQL write paths the shared MySQL-oriented guard misses: SELECT ... INTO, procedure calls (T-SQL allows a
// second statement without a semicolon), INSERT/MERGE without INTO, and linked-server or ad hoc remote access.
// This is a best-effort backstop, not exhaustive; least-privilege database credentials are the real control.
const TSQL_WRITE_PATTERN =
  /\b(INTO|EXEC|EXECUTE|INSERT|MERGE|OPENROWSET|OPENQUERY|OPENDATASOURCE|WAITFOR)\b/i;

// Replaces comments, string literals, and quoted identifiers with a space so the write-token scan only sees SQL
// tokens. A keyword inside a literal or [identifier] is not a statement, and a comment is whitespace to T-SQL
// (`DROP/**/TABLE` is `DROP TABLE`). Only the check sees this text; the original SQL is what runs. Block comments
// nest in T-SQL, so an unmatched `*/` can only leave extra text visible to the scan, never hide any.
const blankNonCode = (sql: string): string => {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === '-' && next === '-') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
      out += ' ';
    } else if (char === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      out += ' ';
    } else if (char === "'" || char === '"' || char === '[') {
      const close = char === '[' ? ']' : char;
      i++;
      while (i < sql.length) {
        if (sql[i] === close && sql[i + 1] === close) {
          i += 2; // a doubled delimiter is an escaped delimiter ('' "" ]])
        } else if (sql[i] === close) {
          i++;
          break;
        } else {
          i++;
        }
      }
      out += ' ';
    } else {
      out += char;
      i++;
    }
  }
  return out;
};

interface SqlResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  /** Rows changed by each statement, as reported by SQL Server (relevant for writes). */
  rowsAffected: number[];
  truncated: boolean;
}

// Matches the Actions default for xpack.actions.maxResponseContentLength when the client did not record one.
const DEFAULT_MAX_CONTENT_LENGTH = 1024 * 1024;

const rowByteLength = (row: Record<string, unknown>): number =>
  Buffer.byteLength(JSON.stringify(row), 'utf8');

// mssql reports our own cancellation as a "Canceled." error; anything else is a real failure.
const isCancellation = (err: Error): boolean =>
  (err as { code?: string }).code === 'ECANCEL' || err.message === 'Canceled.';

/**
 * Streams rows so memory stays bounded: rows are retained only until `maxRows` or the Actions maximum
 * response size is reached, then the result is flagged as truncated. With `cancelOnLimit` the request is
 * cancelled at that point (reads); without it the statement runs to completion and the rest of the output
 * is discarded (writes must not be rolled back just to cap what is returned).
 * A single row is fully buffered by the driver before it is seen here, so one very large value cannot be
 * prevented from being read, only from being retained.
 */
const runSql = async (
  ctx: ActionContext,
  sql: string,
  {
    params = {},
    maxRows = DEFAULT_MAX_ROWS,
    cancelOnLimit = true,
  }: { params?: Record<string, string>; maxRows?: number; cancelOnLimit?: boolean } = {}
): Promise<SqlResult> => {
  const pool = await ctx.getClient('mssql');
  const maxContentLength = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
  const request = pool.request();
  request.stream = true;
  Object.entries(params).forEach(([name, value]) => request.input(name, value));

  return new Promise<SqlResult>((resolve, reject) => {
    const rows: Array<Record<string, unknown>> = [];
    let retainedBytes = 0;
    let truncated = false;
    let cancelled = false;
    let firstError: Error | undefined;

    request.on('row', (row: Record<string, unknown>) => {
      if (truncated) return;
      const rowBytes = rowByteLength(row);
      if (rows.length >= maxRows || retainedBytes + rowBytes > maxContentLength) {
        truncated = true;
        if (cancelOnLimit) {
          cancelled = true;
          request.cancel();
        }
        return;
      }
      rows.push(row);
      retainedBytes += rowBytes;
    });
    // In stream mode `done` always follows `error`, so settle there.
    request.on('error', (err: Error) => {
      if (cancelled && isCancellation(err)) return;
      firstError = firstError ?? err;
    });
    request.on('done', (summary: { rowsAffected?: number[] }) => {
      if (firstError) {
        reject(firstError);
        return;
      }
      resolve({
        rows,
        rowCount: rows.length,
        rowsAffected: summary?.rowsAffected ?? [],
        truncated,
      });
    });
    // Driver failures raised before any event fires (e.g. an unsupported parameter) reject this promise
    // instead; without consuming it the rejection is unhandled and this call would never settle.
    void request.query(sql).catch(reject);
  });
};

// Quotes a T-SQL identifier as [name], doubling any closing bracket.
const quoteIdentifier = (identifier: string): string => `[${identifier.replace(/\]/g, ']]')}]`;

// T-SQL LIKE also treats [ as a wildcard, which the shared escape (! % _) does not cover.
const escapeSearchTerm = (term: string): string =>
  escapeLikePattern(term.toLowerCase(), false).replace(/\[/g, '![');

const resolveMaxRows = (maxRows?: number): number => maxRows ?? DEFAULT_MAX_ROWS;

export const AzureSql: ConnectorSpec = {
  metadata: {
    id: '.azure_sql',
    displayName: 'Azure SQL',
    description: i18n.translate('core.kibanaConnectorSpecs.azureSql.metadata.description', {
      defaultMessage:
        'Query tables, search rows, explore schema, and execute SQL in an Azure SQL Database',
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
          i18n.translate('core.kibanaConnectorSpecs.azureSql.config.host.description', {
            defaultMessage: 'The Azure SQL server hostname',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.azureSql.config.host.label', {
            defaultMessage: 'Server',
          }),
          placeholder: 'myserver.database.windows.net',
          helpText: i18n.translate('core.kibanaConnectorSpecs.azureSql.config.host.helpText', {
            defaultMessage:
              'The fully qualified server name from the Azure portal, for example myserver.database.windows.net (no ' +
              'protocol prefix).',
          }),
        }),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(1433)
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.azureSql.config.port.description', {
            defaultMessage: 'The Azure SQL server port',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('core.kibanaConnectorSpecs.azureSql.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '1433',
          helpText: i18n.translate('core.kibanaConnectorSpecs.azureSql.config.port.helpText', {
            defaultMessage: 'The port number of the Azure SQL server (default: 1433)',
          }),
        }),
      database: z
        .string()
        .min(1)
        .max(128)
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.azureSql.config.database.description', {
            defaultMessage: 'The database to connect to',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.azureSql.config.database.label', {
            defaultMessage: 'Database',
          }),
          placeholder: 'my_database',
          helpText: i18n.translate('core.kibanaConnectorSpecs.azureSql.config.database.helpText', {
            defaultMessage:
              'The name of the database to query. Azure SQL cannot switch databases within a connection, so create ' +
              'one connector per database.',
          }),
        }),
    })
  ),

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Execute a read-only T-SQL SELECT query against the Azure SQL database. Only SELECT and WITH statements are ' +
        'permitted; INSERT, UPDATE, DELETE, EXEC, SELECT INTO, and DDL are blocked. Use TOP or OFFSET/FETCH to bound ' +
        'results (e.g. SELECT TOP 100 ...); LIMIT is not valid T-SQL. Do not include a trailing semicolon. Results ' +
        'are capped at maxRows (default 100, max 1000) and at the maximum response size, and flagged as truncated ' +
        'when more rows exist. Use listTables first to discover tables, and describeTable to inspect column names ' +
        'before writing queries.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        assertReadOnly(blankNonCode(input.sql), SELECT_OR_WITH_PREFIX, TSQL_WRITE_PATTERN);
        return runSql(ctx, input.sql, { maxRows: resolveMaxRows(input.maxRows) });
      },
    },

    listDatabases: {
      isTool: true,
      scope: 'read',
      description:
        'List the databases visible to the authenticated login on the Azure SQL server. When connected to a user ' +
        'database this usually returns only that database and master. Each connector targets a single database, so ' +
        'use this to confirm the connected database name.',
      input: ListDatabasesInputSchema,
      handler: async (ctx) =>
        runSql(
          ctx,
          'SELECT name, database_id, state_desc, compatibility_level, create_date FROM sys.databases ORDER BY name',
          { maxRows: MAX_MAX_ROWS }
        ),
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List the tables and views in the connected Azure SQL database, with their schema and type (BASE TABLE or ' +
        'VIEW). Pass schema to narrow the list. Use describeTable to inspect column names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const where = input.schema ? ' WHERE TABLE_SCHEMA = @schema' : '';
        return runSql(
          ctx,
          `SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS [name], TABLE_TYPE AS [type]
            FROM INFORMATION_SCHEMA.TABLES${where}
            ORDER BY TABLE_SCHEMA, TABLE_NAME`,
          { params: input.schema ? { schema: input.schema } : {}, maxRows: MAX_MAX_ROWS }
        );
      },
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a table or view in Azure SQL: returns columns (name, data type, length, precision, nullability, ' +
        'default), primary key and unique constraints, and foreign keys with the table and column they reference. ' +
        'Use this before query or searchRows to discover available columns and build correct queries.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const schema = input.schema ?? DEFAULT_SCHEMA;
        const params = { schema, table: input.table };

        const columns = await runSql(
          ctx,
          `SELECT COLUMN_NAME AS [name], ORDINAL_POSITION AS position, DATA_TYPE AS dataType,
            CHARACTER_MAXIMUM_LENGTH AS maxLength, NUMERIC_PRECISION AS numericPrecision,
            NUMERIC_SCALE AS numericScale, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS defaultValue
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
          ORDER BY ORDINAL_POSITION`,
          { params, maxRows: MAX_MAX_ROWS }
        );
        if (columns.rowCount === 0) {
          throw new Error(
            `Table or view ${schema}.${input.table} was not found. Use listTables to see available names.`
          );
        }

        const constraints = await runSql(
          ctx,
          `SELECT tc.CONSTRAINT_NAME AS [name], tc.CONSTRAINT_TYPE AS [type],
            kcu.COLUMN_NAME AS columnName, kcu.ORDINAL_POSITION AS position
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            ON kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
            AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
            AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
            AND kcu.TABLE_NAME = tc.TABLE_NAME
          WHERE tc.TABLE_SCHEMA = @schema AND tc.TABLE_NAME = @table
            AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
          ORDER BY tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
          { params, maxRows: MAX_MAX_ROWS }
        );

        const foreignKeys = await runSql(
          ctx,
          `SELECT fk.name AS [name],
            COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS columnName,
            OBJECT_SCHEMA_NAME(fkc.referenced_object_id) AS referencedSchema,
            OBJECT_NAME(fkc.referenced_object_id) AS referencedTable,
            COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referencedColumn
          FROM sys.foreign_keys fk
          JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
          WHERE fk.parent_object_id = OBJECT_ID(@qualifiedName)
          ORDER BY fk.name, fkc.constraint_column_id`,
          {
            params: {
              qualifiedName: `${quoteIdentifier(schema)}.${quoteIdentifier(input.table)}`,
            },
            maxRows: MAX_MAX_ROWS,
          }
        );

        return {
          schema,
          table: input.table,
          columns: columns.rows,
          constraints: constraints.rows,
          foreignKeys: foreignKeys.rows,
        };
      },
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in an Azure SQL table by matching a text value against one or more character columns using ' +
        'LIKE (case-insensitive partial match). Returns up to maxRows results (default 100). Use describeTable first ' +
        'to discover searchable column names; searching a non-character column (such as text, xml, or varbinary) ' +
        'fails. Prefer query (SQL SELECT) for structured filtering; use searchRows for broad text discovery across ' +
        'known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const schema = input.schema ?? DEFAULT_SCHEMA;
        const whereClause = input.columns
          .map((col) => `LOWER(${quoteIdentifier(col)}) LIKE @pattern ESCAPE '!'`)
          .join(' OR ');
        const maxRows = resolveMaxRows(input.maxRows);
        // The cap is enforced while streaming; TOP also lets SQL Server stop reading early.
        const sql =
          `SELECT TOP (${maxRows + 1}) * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(
            input.table
          )}` + ` WHERE ${whereClause}`;
        return runSql(ctx, sql, {
          params: { pattern: `%${escapeSearchTerm(input.searchTerm)}%` },
          maxRows,
        });
      },
    },

    executeSql: {
      isTool: false,
      scope: 'destroy',
      description:
        'Execute any T-SQL statement against the Azure SQL database. No restrictions — INSERT, UPDATE, DELETE, DROP, ' +
        'EXEC, and DDL are all permitted. Use only when the workflow explicitly requires a write or destructive ' +
        'operation. Prefer query for read-only access. The statement always runs to completion; only the first 1000 ' +
        'output rows are returned (truncated is true when more were produced).',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) =>
        runSql(ctx, input.sql, { maxRows: MAX_MAX_ROWS, cancelOnLimit: false }),
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.azureSql.test.description', {
      defaultMessage: 'Verifies the Azure SQL connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await runSql(ctx, 'SELECT 1 AS ok', { maxRows: 1 });
      return { message: 'Successfully connected to Azure SQL' };
    },
  },

  skill: [
    '## Azure SQL Connector',
    '',
    'Access to a single Azure SQL database. Read actions (`query`, `searchRows`, `listDatabases`, `listTables`, ' +
      '`describeTable`) are read-only and safe to call freely. `executeSql` is unrestricted — use it only when a ' +
      'write or destructive operation is explicitly required.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listTables` — list tables and views with their schema (usually `dbo`).',
    '2. `describeTable` — inspect columns, types, keys, and foreign keys before writing a query. Pass `schema` if ' +
      'the table is not in `dbo`.',
    '3. `query` or `searchRows` — read the data.',
    '',
    '### Choosing between `query`, `searchRows`, and `executeSql`',
    '- Prefer `query` for structured filtering, joins, aggregation, or anything expressible as a SELECT.',
    '- Prefer `searchRows` for broad text lookups across a known set of character columns.',
    '- Use `executeSql` only for writes or DDL that the workflow explicitly requires.',
    '- Do not send `INFORMATION_SCHEMA` lookups to `query` when `listTables` or `describeTable` answers the question.',
    '',
    '### Gotchas',
    '- This is T-SQL, not MySQL: bound results with `SELECT TOP 100 ...` or `ORDER BY ... OFFSET 0 ROWS FETCH NEXT ' +
      '100 ROWS ONLY`. `LIMIT` is a syntax error. Quote identifiers with `[brackets]`, not backticks.',
    '- `query` only allows SELECT and WITH — multi-statement SQL and write SQL are rejected; use `executeSql` for ' +
      'writes.',
    '- Results are capped at `maxRows` (default 100, max 1000) and at the maximum response size, so very wide rows ' +
      'can truncate earlier. When `truncated` is true, narrow the query with a WHERE clause or aggregate instead of ' +
      'raising `maxRows`.',
    '- Cross-database queries (`otherdb.dbo.table`) are not supported by Azure SQL Database. Each connector targets ' +
      'one database.',
    '- Tables outside the `dbo` schema must be schema-qualified in `query` SQL (for example `sales.Orders`).',
  ].join('\n'),
};
