/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Oracle Database Connector
 *
 * Connects directly to an Oracle Database over the native Oracle Net (TNS) protocol (via `oracledb` in Thin mode,
 * so no Oracle Client libraries are needed) rather than HTTP. The pooled client comes from
 * `ctx.getClient('oracle')` (see `lib/clients/oracle.ts`); the framework's client lease pool handles lifecycle and
 * enforces `xpack.actions.allowedHosts`.
 *
 * Username and password are declared under `auth: { types: ['basic'] }` so they are encrypted at rest. The
 * database is identified by service name only (no SID). `config.ssl` lets servers without TCPS turn TLS off; the
 * default is encrypted.
 *
 * `query` accepts SELECT/WITH only (the shared `assertReadOnly` plus an Oracle guard) and runs in a READ ONLY
 * transaction. Results are streamed and retained only up to `maxRows` and the Actions maximum response size.
 * `executeSql` is unrestricted, commits on success, carries `scope: 'destroy'`, and is not exposed as a tool.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, SELECT_OR_WITH_PREFIX } from '../../lib/generic_db_connector';
import {
  blankNonCode,
  MAX_MAX_ROWS,
  ORACLE_READ_GUARD_PATTERN,
  quoteIdentifier,
  resolveMaxRows,
  escapeSearchTerm,
  runQuery,
  runStatement,
  stripTrailingSemicolon,
} from '../../lib/oracle_sql';
import {
  type DescribeTableInput,
  DescribeTableInputSchema,
  type ExecuteSqlInput,
  ExecuteSqlInputSchema,
  ListSchemasInputSchema,
  type ListTablesInput,
  ListTablesInputSchema,
  type QueryInput,
  QueryInputSchema,
  type SearchRowsInput,
  SearchRowsInputSchema,
} from './types';

const getCurrentSchema = async (ctx: ActionContext): Promise<string> => {
  const { rows } = await runQuery(
    ctx,
    `SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS "schema" FROM DUAL`,
    { maxRows: 1 }
  );
  const schema = rows[0]?.schema;
  if (typeof schema !== 'string') {
    throw new Error('Could not determine the current schema; pass schema explicitly');
  }
  return schema;
};

// Unquoted Oracle names are stored upper-case, but agents usually pass them as written in prose. Try the exact name
// first, then the upper-case form.
const uniqueNames = (name: string): string[] => Array.from(new Set([name, name.toUpperCase()]));

interface ResolvedTable {
  schema: string;
  table: string;
  columns: Array<Record<string, unknown>>;
  truncated: boolean;
}

const COLUMNS_SQL = `SELECT COLUMN_NAME AS "name", COLUMN_ID AS "position", DATA_TYPE AS "dataType",
    DATA_LENGTH AS "dataLength", CHAR_LENGTH AS "charLength", DATA_PRECISION AS "numericPrecision",
    DATA_SCALE AS "numericScale", NULLABLE AS "nullable", DATA_DEFAULT AS "defaultValue"
  FROM ALL_TAB_COLUMNS
  WHERE OWNER = :ownerName AND TABLE_NAME = :tableName
  ORDER BY COLUMN_ID`;

const resolveTable = async (
  ctx: ActionContext,
  inputSchema: string | undefined,
  inputTable: string
): Promise<ResolvedTable> => {
  const schemas = uniqueNames(inputSchema ?? (await getCurrentSchema(ctx)));
  for (const schema of schemas) {
    for (const table of uniqueNames(inputTable)) {
      const columns = await runQuery(ctx, COLUMNS_SQL, {
        binds: { ownerName: schema, tableName: table },
        maxRows: MAX_MAX_ROWS,
      });
      if (columns.rowCount > 0) {
        return { schema, table, columns: columns.rows, truncated: columns.truncated };
      }
    }
  }
  throw new Error(
    `Table or view ${schemas[0]}.${inputTable} was not found, or the connected user cannot see it. ` +
      'Use listTables to see available names.'
  );
};

export const OracleConnector: ConnectorSpec = {
  metadata: {
    id: '.oracle',
    displayName: 'Oracle Database',
    description: i18n.translate('connectorSpecs.oracle.metadata.description', {
      defaultMessage:
        'Query tables, search rows, explore schema, and execute SQL in an Oracle Database',
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
          i18n.translate('connectorSpecs.oracle.config.host.description', {
            defaultMessage: 'The Oracle Database hostname or IP address',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.oracle.config.host.label', {
            defaultMessage: 'Host',
          }),
          placeholder: 'oracle.example.com',
          helpText: i18n.translate('connectorSpecs.oracle.config.host.helpText', {
            defaultMessage:
              'The hostname or IP address of the Oracle listener (no protocol prefix).',
          }),
        }),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(1521)
        .describe(
          i18n.translate('connectorSpecs.oracle.config.port.description', {
            defaultMessage: 'The Oracle listener port',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('connectorSpecs.oracle.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '1521',
          helpText: i18n.translate('connectorSpecs.oracle.config.port.helpText', {
            defaultMessage: 'The port of the Oracle listener (default: 1521)',
          }),
        }),
      serviceName: z
        .string()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9._-]+$/, {
          message: 'Service name may contain only letters, digits, dots, underscores, and hyphens',
        })
        .describe(
          i18n.translate('connectorSpecs.oracle.config.serviceName.description', {
            defaultMessage: 'The Oracle service name to connect to',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.oracle.config.serviceName.label', {
            defaultMessage: 'Service name',
          }),
          placeholder: 'ORCLPDB1',
          helpText: i18n.translate('connectorSpecs.oracle.config.serviceName.helpText', {
            defaultMessage:
              'The service name registered with the listener, such as the name of a pluggable database. SIDs are not supported.',
          }),
        }),
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('connectorSpecs.oracle.config.ssl.description', {
            defaultMessage: 'Whether to use TLS (TCPS) when connecting to Oracle Database',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.oracle.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('connectorSpecs.oracle.config.ssl.helpText', {
            defaultMessage:
              'Required (default) connects over TCPS using Kibana TLS settings. Disable only for listeners that do not support TCPS.',
          }),
        }),
    })
  ),

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Execute a read-only Oracle SQL SELECT query against the database. Only SELECT and WITH statements are ' +
        'permitted; INSERT, UPDATE, DELETE, MERGE, DDL, PL/SQL, SELECT ... FOR UPDATE, database links, and the ' +
        'UTL_* and DBMS_* packages are blocked. Bound results with FETCH FIRST n ROWS ONLY; LIMIT and TOP are not ' +
        'valid in Oracle. Unquoted table and column names are upper-case. Do not include a trailing semicolon. ' +
        'Results are capped at maxRows (default 100, max 1000) and at the maximum response size, and flagged as ' +
        'truncated when more rows exist. Use listTables first to discover tables, and describeTable to inspect ' +
        'column names before writing queries.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const blanked = blankNonCode(input.sql);
        assertReadOnly(blanked, SELECT_OR_WITH_PREFIX, ORACLE_READ_GUARD_PATTERN);
        return runQuery(ctx, stripTrailingSemicolon(input.sql, blanked), {
          maxRows: resolveMaxRows(input.maxRows),
        });
      },
    },

    listSchemas: {
      isTool: true,
      scope: 'read',
      description:
        'List the schemas (database users) visible to the connected user, with their creation date. Includes ' +
        'Oracle-maintained schemas such as SYS and SYSTEM; application data is usually in the others. Use this to ' +
        'discover the schema name to pass to listTables, describeTable, or searchRows, or to qualify tables in query.',
      input: ListSchemasInputSchema,
      handler: async (ctx) =>
        runQuery(
          ctx,
          'SELECT USERNAME AS "name", CREATED AS "created" FROM ALL_USERS ORDER BY USERNAME',
          {
            maxRows: MAX_MAX_ROWS,
          }
        ),
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List the tables and views in a schema that the connected user can see, with their type (TABLE or VIEW). ' +
        'Pass schema to list another schema; it defaults to the connected user. Use describeTable to inspect column ' +
        'names and types before querying.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const schemas = uniqueNames(input.schema ?? (await getCurrentSchema(ctx)));
        const tableBinds = schemas.map((_, index) => `:t${index}`).join(', ');
        const viewBinds = schemas.map((_, index) => `:v${index}`).join(', ');
        const binds = Object.fromEntries(
          schemas.flatMap((schema, index) => [
            [`t${index}`, schema],
            [`v${index}`, schema],
          ])
        );
        return runQuery(
          ctx,
          `SELECT OWNER AS "schema", TABLE_NAME AS "name", 'TABLE' AS "type" FROM ALL_TABLES
            WHERE OWNER IN (${tableBinds}) AND TABLE_NAME NOT LIKE 'BIN$%'
          UNION ALL
          SELECT OWNER, VIEW_NAME, 'VIEW' FROM ALL_VIEWS WHERE OWNER IN (${viewBinds})
          ORDER BY 1, 2`,
          { binds, maxRows: MAX_MAX_ROWS }
        );
      },
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a table or view: returns columns (name, data type, length, precision, nullability, default), ' +
        'primary key and unique constraints, and foreign keys with the table and column they reference. truncated ' +
        'is true when the metadata was cut off by the response size limit and is incomplete. Use this before query ' +
        'or searchRows to discover available columns and build correct queries.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const resolved = await resolveTable(ctx, input.schema, input.table);
        const binds = { ownerName: resolved.schema, tableName: resolved.table };

        const constraints = await runQuery(
          ctx,
          `SELECT c.CONSTRAINT_NAME AS "name",
              CASE c.CONSTRAINT_TYPE WHEN 'P' THEN 'PRIMARY KEY' ELSE 'UNIQUE' END AS "type",
              cc.COLUMN_NAME AS "columnName", cc.POSITION AS "position"
            FROM ALL_CONSTRAINTS c
            JOIN ALL_CONS_COLUMNS cc ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
            WHERE c.OWNER = :ownerName AND c.TABLE_NAME = :tableName AND c.CONSTRAINT_TYPE IN ('P', 'U')
            ORDER BY c.CONSTRAINT_NAME, cc.POSITION`,
          { binds, maxRows: MAX_MAX_ROWS }
        );

        const foreignKeys = await runQuery(
          ctx,
          `SELECT c.CONSTRAINT_NAME AS "name", cc.COLUMN_NAME AS "columnName",
              r.OWNER AS "referencedSchema", r.TABLE_NAME AS "referencedTable",
              rc.COLUMN_NAME AS "referencedColumn"
            FROM ALL_CONSTRAINTS c
            JOIN ALL_CONS_COLUMNS cc ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
            JOIN ALL_CONSTRAINTS r ON r.OWNER = c.R_OWNER AND r.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME
            JOIN ALL_CONS_COLUMNS rc ON rc.OWNER = r.OWNER AND rc.CONSTRAINT_NAME = r.CONSTRAINT_NAME
              AND rc.POSITION = cc.POSITION
            WHERE c.OWNER = :ownerName AND c.TABLE_NAME = :tableName AND c.CONSTRAINT_TYPE = 'R'
            ORDER BY c.CONSTRAINT_NAME, cc.POSITION`,
          { binds, maxRows: MAX_MAX_ROWS }
        );

        return {
          schema: resolved.schema,
          table: resolved.table,
          columns: resolved.columns,
          constraints: constraints.rows,
          foreignKeys: foreignKeys.rows,
          truncated: resolved.truncated || constraints.truncated || foreignKeys.truncated,
        };
      },
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in a table by matching a text value against one or more columns using LIKE ' +
        '(case-insensitive partial match). Returns up to maxRows results (default 100). Use describeTable first to ' +
        'discover searchable column names; searching a LOB or other non-text column fails. Prefer query (SQL SELECT) ' +
        'for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const resolved = await resolveTable(ctx, input.schema, input.table);
        const actualNames = resolved.columns.map((column) => String(column.name));
        const columns = input.columns.map((requested) => {
          const match =
            actualNames.find((name) => name === requested) ??
            actualNames.find((name) => name === requested.toUpperCase());
          if (!match) {
            throw new Error(
              `Column ${requested} was not found in ${resolved.schema}.${resolved.table}. ` +
                'Use describeTable to see the column names.'
            );
          }
          return match;
        });
        const maxRows = resolveMaxRows(input.maxRows);
        const pattern = `%${escapeSearchTerm(input.searchTerm)}%`;
        const whereClause = columns
          .map((column, index) => `LOWER(${quoteIdentifier(column)}) LIKE :p${index} ESCAPE '!'`)
          .join(' OR ');
        return runQuery(
          ctx,
          `SELECT * FROM ${quoteIdentifier(resolved.schema)}.${quoteIdentifier(resolved.table)}` +
            ` WHERE ${whereClause} FETCH FIRST ${maxRows + 1} ROWS ONLY`,
          {
            binds: Object.fromEntries(columns.map((_, index) => [`p${index}`, pattern])),
            maxRows,
          }
        );
      },
    },

    executeSql: {
      isTool: false,
      scope: 'destroy',
      description:
        'Execute any Oracle SQL or PL/SQL statement against the database and commit it. No restrictions — INSERT, ' +
        'UPDATE, DELETE, DROP, DDL, and PL/SQL blocks are all permitted. Use only when the workflow explicitly ' +
        'requires a write or destructive operation. Prefer query for read-only access. If a call times out, do ' +
        'not assume that no changes were made. Only the first 1000 output rows are returned (truncated is true ' +
        'when more were produced).',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) => runStatement(ctx, input.sql),
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.oracle.test.description', {
      defaultMessage: 'Verifies the Oracle Database connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await runQuery(ctx, 'SELECT 1 FROM DUAL', { maxRows: 1 });
      return { message: 'Successfully connected to Oracle Database' };
    },
  },

  skill: [
    '## Oracle Database Connector',
    '',
    'Access to one Oracle Database service. Read actions (`query`, `searchRows`, `listSchemas`, `listTables`, ' +
      '`describeTable`) are read-only and safe to call freely. This connector is read-only for agents; writes are ' +
      'not available.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listSchemas` — see which schemas exist. Skip Oracle-maintained ones such as SYS, SYSTEM, and the like.',
    '2. `listTables` — list tables and views in a schema (defaults to the connected user).',
    '3. `describeTable` — inspect columns, types, keys, and foreign keys before writing a query.',
    '4. `query` or `searchRows` — read the data.',
    '',
    '### Choosing between `query` and `searchRows`',
    '- Prefer `query` for structured filtering, joins, aggregation, or anything expressible as a SELECT.',
    '- Prefer `searchRows` for broad text lookups across a known set of text columns.',
    '- Do not send `ALL_TABLES` or `ALL_TAB_COLUMNS` lookups to `query` when `listTables` or `describeTable` answers ' +
      'the question.',
    '',
    '### Gotchas',
    '- This is Oracle SQL, not MySQL: bound results with `FETCH FIRST 100 ROWS ONLY` (or `ROWNUM <= 100`). `LIMIT` ' +
      'and `TOP` are syntax errors. A SELECT with no table needs `FROM DUAL`.',
    '- Unquoted names are upper-case (`employees` is `EMPLOYEES`). Quote with double quotes only for mixed-case ' +
      'names, and match the case `listTables` returned.',
    '- Tables outside the connected user schema must be schema-qualified in `query` SQL (for example `HR.EMPLOYEES`).',
    '- `query` only allows SELECT and WITH. Multi-statement SQL, writes, PL/SQL, `FOR UPDATE`, database links ' +
      '(`@`), and the `UTL_*` and `DBMS_*` packages are rejected. Do not end the SQL with a semicolon.',
    '- Results are capped at `maxRows` (default 100, max 1000) and at the maximum response size, so very wide rows ' +
      'can truncate earlier. When `truncated` is true, narrow the query with a WHERE clause or aggregate instead of ' +
      'raising `maxRows`.',
    '- Text LOB (CLOB) values are cut at 10,000 characters, and BLOB values are described rather than returned. ' +
      'NUMBER values above 15 significant digits can lose precision.',
    '- DATE and TIMESTAMP values come back as zoneless wall-clock strings such as `2026-01-02T03:04:05`. ' +
      'Timestamps with a time zone come back as UTC instants ending in `Z`.',
  ].join('\n'),
};
