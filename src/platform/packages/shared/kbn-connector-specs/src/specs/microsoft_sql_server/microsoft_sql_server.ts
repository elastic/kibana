/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Microsoft SQL Server Connector
 *
 * Connects directly to a SQL Server instance (on-premises, VM, container, or Amazon RDS for SQL Server) over
 * the native TDS protocol (via `mssql`, which wraps `tedious`) rather than HTTP. It shares the pooled
 * `ctx.getClient('mssql')` client and the T-SQL helpers in `lib/mssql_sql.ts` with the Azure SQL connector;
 * the framework's client lease pool handles lifecycle and enforces `xpack.actions.allowedHosts`.
 *
 * Username and password are declared under `auth: { types: ['basic'] }` so they are encrypted at rest.
 * Only SQL Server authentication is supported (no Windows/Kerberos or Microsoft Entra ID). `config.ssl`
 * lets self-managed servers without a certificate turn encryption off; the default is encrypted.
 *
 * `query` accepts SELECT/WITH only (the shared `assertReadOnly` plus a T-SQL write pattern). Results are
 * streamed and retained only up to `maxRows` and the Actions maximum response size. Unlike Azure SQL
 * Database, SQL Server can read other databases with three-part names, so `listTables` takes a `database`.
 * `executeSql` is unrestricted, carries `scope: 'destroy'`, and is never cancelled to cap its output.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, SELECT_OR_WITH_PREFIX } from '../../lib/generic_db_connector';
import {
  blankNonCode,
  DEFAULT_SCHEMA,
  escapeSearchTerm,
  MAX_MAX_ROWS,
  quoteIdentifier,
  resolveMaxRows,
  runSql,
  TSQL_WRITE_PATTERN,
} from '../../lib/mssql_sql';
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

export const MicrosoftSqlServer: ConnectorSpec = {
  metadata: {
    id: '.microsoft_sql_server',
    displayName: 'Microsoft SQL Server',
    description: i18n.translate('connectorSpecs.microsoftSqlServer.metadata.description', {
      defaultMessage:
        'Query tables, search rows, explore schema, and execute SQL in a Microsoft SQL Server database',
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
          i18n.translate('connectorSpecs.microsoftSqlServer.config.host.description', {
            defaultMessage: 'The SQL Server hostname or IP address',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.microsoftSqlServer.config.host.label', {
            defaultMessage: 'Server',
          }),
          placeholder: 'sql.example.com',
          helpText: i18n.translate('connectorSpecs.microsoftSqlServer.config.host.helpText', {
            defaultMessage:
              'The hostname or IP address of the SQL Server instance, without a protocol prefix. Named instances ' +
              'are not supported; use the instance port instead.',
          }),
        }),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(1433)
        .describe(
          i18n.translate('connectorSpecs.microsoftSqlServer.config.port.description', {
            defaultMessage: 'The SQL Server port',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('connectorSpecs.microsoftSqlServer.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '1433',
          helpText: i18n.translate('connectorSpecs.microsoftSqlServer.config.port.helpText', {
            defaultMessage: 'The TCP port of the SQL Server instance (default: 1433)',
          }),
        }),
      database: z
        .string()
        .min(1)
        .max(128)
        .describe(
          i18n.translate('connectorSpecs.microsoftSqlServer.config.database.description', {
            defaultMessage: 'The database to connect to',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.microsoftSqlServer.config.database.label', {
            defaultMessage: 'Database',
          }),
          placeholder: 'my_database',
          helpText: i18n.translate('connectorSpecs.microsoftSqlServer.config.database.helpText', {
            defaultMessage:
              'The database the connection opens in. Queries can still read other databases the login can access ' +
              'by using three-part names.',
          }),
        }),
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('connectorSpecs.microsoftSqlServer.config.ssl.description', {
            defaultMessage: 'Whether to encrypt the connection to SQL Server with TLS',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.microsoftSqlServer.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('connectorSpecs.microsoftSqlServer.config.ssl.helpText', {
            defaultMessage:
              'Required (default) encrypts the connection using Kibana TLS settings. Disable only for servers that ' +
              'do not support encryption.',
          }),
        }),
    })
  ),

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Execute a read-only T-SQL SELECT query against the SQL Server database. Only SELECT and WITH statements are ' +
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
        'List the databases on the SQL Server instance that the authenticated login can see, with their state, ' +
        'compatibility level, and creation date. Use this to discover database names to pass to listTables, or to ' +
        'build three-part names (database.schema.table) in query.',
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
        'List the tables and views in a database, with their schema and type (BASE TABLE or VIEW). Pass database ' +
        'to list another database on the server, and schema to narrow the list. Use describeTable to inspect column ' +
        'names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const prefix = input.database ? `${quoteIdentifier(input.database)}.` : '';
        const where = input.schema ? ' WHERE TABLE_SCHEMA = @schema' : '';
        return runSql(
          ctx,
          `SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS [name], TABLE_TYPE AS [type]
            FROM ${prefix}INFORMATION_SCHEMA.TABLES${where}
            ORDER BY TABLE_SCHEMA, TABLE_NAME`,
          { params: input.schema ? { schema: input.schema } : {}, maxRows: MAX_MAX_ROWS }
        );
      },
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a table or view in the connected database: returns columns (name, data type, length, precision, ' +
        'nullability, default), primary key and unique constraints, and foreign keys with the table and column they ' +
        'reference. Use this before query or searchRows to discover available columns and build correct queries.',
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
        'Search for rows in a table by matching a text value against one or more character columns using LIKE ' +
        '(case-insensitive partial match). Returns up to maxRows results (default 100). Use describeTable first to ' +
        'discover searchable column names; searching a non-character column (such as text, xml, or varbinary) ' +
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
        'Execute any T-SQL statement against the SQL Server database. No restrictions — INSERT, UPDATE, DELETE, ' +
        'DROP, EXEC, and DDL are all permitted. Use only when the workflow explicitly requires a write or ' +
        'destructive operation. Prefer query for read-only access. The statement always runs to completion; only ' +
        'the first 1000 output rows are returned (truncated is true when more were produced).',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) =>
        runSql(ctx, input.sql, { maxRows: MAX_MAX_ROWS, cancelOnLimit: false }),
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.microsoftSqlServer.test.description', {
      defaultMessage: 'Verifies the SQL Server connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await runSql(ctx, 'SELECT 1 AS ok', { maxRows: 1 });
      return { message: 'Successfully connected to Microsoft SQL Server' };
    },
  },

  skill: [
    '## Microsoft SQL Server Connector',
    '',
    'Access to one SQL Server database (and, through three-part names, other databases the login can read). ' +
      'Read actions (`query`, `searchRows`, `listDatabases`, `listTables`, `describeTable`) are read-only and safe ' +
      'to call freely. `executeSql` is unrestricted — use it only when a write or destructive operation is ' +
      'explicitly required.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listDatabases` — only if the question names a database other than the connected one.',
    '2. `listTables` — list tables and views with their schema (usually `dbo`). Pass `database` for another database.',
    '3. `describeTable` — inspect columns, types, keys, and foreign keys before writing a query. Pass `schema` if ' +
      'the table is not in `dbo`. It describes the connected database only.',
    '4. `query` or `searchRows` — read the data.',
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
    '- To read another database, use a three-part name in `query` (for example `Analytics.dbo.Orders`). This needs ' +
      'the login to have access to that database.',
    '- Tables outside the `dbo` schema must be schema-qualified in `query` SQL (for example `sales.Orders`).',
  ].join('\n'),
};
