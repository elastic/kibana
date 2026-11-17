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
 * Connects directly to an Oracle database over the Oracle Net (TNS) binary protocol
 * (via `oracledb` in Thin mode, which needs no Oracle Client libraries) rather than HTTP.
 * The connection pool is managed by the framework's client lease pool via
 * `ctx.getClient('oracle')`, which handles lifecycle and enforces
 * `xpack.actions.allowedHosts` before the first connection.
 *
 * Username and password are declared under `auth: { types: ['basic'] }` so they are encrypted at rest;
 * `oracleClientType` in `lib/clients/oracle.ts` decodes them from the Authorization header.
 *
 * `query` accepts SELECT/WITH only. It is checked by `assertReadOnly` and also runs inside a
 * `SET TRANSACTION READ ONLY` transaction, so the database rejects writes the check missed.
 * `executeSql` is unrestricted and carries `scope: 'destroy'`.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Connection, Pool } from 'oracledb';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, escapeLikePattern } from '../../lib/generic_db_connector';
import { getResponseLimit } from '../../lib/clients/mssql_response_limit';
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

const DEFAULT_MAX_ROWS = 100;
const DEFAULT_MAX_CONTENT_LENGTH = 100 * 1024 * 1024;
const CALL_TIMEOUT_MS = 60_000;
const METADATA_MAX_ROWS = 1000;

// FOR UPDATE takes row locks; the packages below reach the network and file system from inside a SELECT.
const ORACLE_EXTRA_WRITE_PATTERN =
  /\b(FOR\s+UPDATE|DBMS_\w+|UTL_\w+|HTTPURITYPE|EXECUTE\s+IMMEDIATE|LOCK\s+TABLE)\b/i;

const CURRENT_SCHEMA = "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')";

interface RunOptions {
  binds?: Record<string, string | null>;
  maxRows?: number;
}

interface RunResult {
  rows: unknown[];
  truncated: boolean;
}

const quoteIdentifier = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

// Oracle rejects a trailing semicolon on SQL; PL/SQL blocks need theirs.
const stripTrailingSemicolon = (sql: string): string => {
  const trimmed = sql.trim();
  if (/^(BEGIN|DECLARE)\b/i.test(trimmed)) return trimmed;
  return trimmed.replace(/;+\s*$/, '');
};

const withConnection = async <T>(
  ctx: ActionContext,
  fn: (connection: Connection, pool: Pool) => Promise<T>
): Promise<T> => {
  const pool = await ctx.getClient('oracle');
  const connection = await pool.getConnection();
  try {
    connection.callTimeout = CALL_TIMEOUT_MS;
    return await fn(connection, pool);
  } finally {
    await connection.close();
  }
};

const execute = async (
  connection: Connection,
  pool: Pool,
  sql: string,
  { binds = {}, maxRows = DEFAULT_MAX_ROWS }: RunOptions = {}
): Promise<RunResult> => {
  // One extra row tells a result that was cut off apart from one that happened to be exactly maxRows.
  const result = await connection.execute(sql, binds, { maxRows: maxRows + 1 });
  const fetched = result.rows ?? [];
  const maxContentLength = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
  const rows: unknown[] = [];
  let size = 0;
  for (const row of fetched.slice(0, maxRows)) {
    size += JSON.stringify(row).length;
    if (size > maxContentLength) break;
    rows.push(row);
  }
  return { rows, truncated: rows.length < fetched.length };
};

const runSql = async (ctx: ActionContext, sql: string, options: RunOptions = {}) =>
  withConnection(ctx, async (connection, pool) => {
    await connection.execute('SET TRANSACTION READ ONLY');
    return execute(connection, pool, sql, options);
  });

const ownerBind = (owner?: string): Record<string, string | null> => ({ owner: owner ?? null });

export const OracleConnector: ConnectorSpec = {
  metadata: {
    id: '.oracle',
    displayName: 'Oracle Database',
    description: i18n.translate('connectorSpecs.oracle.metadata.description', {
      defaultMessage:
        'Query tables, search rows, explore schema, and execute SQL in an Oracle database',
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
        // The host is placed in an Easy Connect string, so characters such as / ? # : @ could add parameters to it.
        .regex(/^(?:[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?|\[[0-9A-Fa-f:.]+\])$/, {
          message:
            'Host must be a hostname or IP address (an IPv6 address in square brackets), without a protocol prefix, port, or path',
        })
        .describe(
          i18n.translate('connectorSpecs.oracle.config.host.description', {
            defaultMessage: 'The Oracle database server hostname or IP address',
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
        .regex(/^[A-Za-z0-9_.$#-]+$/, {
          message: 'Service name may contain only letters, digits, and the characters _ . $ # -',
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
              'The service name registered with the listener, for example the pluggable database service. A SID is not supported.',
          }),
        }),
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('connectorSpecs.oracle.config.ssl.description', {
            defaultMessage: 'Whether to use TLS (TCPS) when connecting to Oracle',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.oracle.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('connectorSpecs.oracle.config.ssl.helpText', {
            defaultMessage:
              'Required (default) connects over TCPS using Kibana TLS settings. Disable only for listeners that do not offer TCPS.',
          }),
        }),
    })
  ),

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Execute a read-only SQL SELECT query against the Oracle database. Only SELECT and WITH statements are permitted; INSERT, UPDATE, DELETE, DDL, PL/SQL, and FOR UPDATE are blocked. Oracle has no LIMIT clause: bound results with FETCH FIRST n ROWS ONLY. Do not include a trailing semicolon. Use listTables first to discover tables and describeTable to learn column names. Unquoted Oracle identifiers are uppercase. Returns { rows, truncated }, where rows are objects keyed by column name.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const sql = stripTrailingSemicolon(input.sql);
        assertReadOnly(sql, undefined, ORACLE_EXTRA_WRITE_PATTERN);
        return runSql(ctx, sql, { maxRows: input.maxRows });
      },
    },

    listSchemas: {
      isTool: true,
      scope: 'read',
      description:
        'List the database schemas (users that own objects) visible to the connected user, excluding Oracle-maintained schemas. Use this first to discover which schemas to pass as owner to listTables and describeTable. Returns { rows, truncated } with a SCHEMA_NAME per row.',
      input: ListSchemasInputSchema,
      handler: async (ctx) =>
        runSql(
          ctx,
          `SELECT username AS schema_name FROM all_users WHERE oracle_maintained = 'N' ORDER BY username`,
          { maxRows: METADATA_MAX_ROWS }
        ),
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List the tables and views in a schema. Specify owner to target a schema, or omit it to use the schema of the connected user. Use describeTable to inspect columns before querying. Returns { rows, truncated } with OWNER, TABLE_NAME, and OBJECT_TYPE (TABLE or VIEW) per row.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) =>
        runSql(
          ctx,
          `SELECT owner, object_name AS table_name, object_type FROM all_objects ` +
            `WHERE object_type IN ('TABLE', 'VIEW') AND owner = NVL(:owner, ${CURRENT_SCHEMA}) ` +
            `ORDER BY object_name`,
          { binds: ownerBind(input.owner), maxRows: METADATA_MAX_ROWS }
        ),
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a table or view: its columns (name, data type, length, precision, scale, nullability) and its primary key, unique, and foreign key constraints. Use this before query or searchRows to discover exact column names. Returns { columns, constraints }.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) =>
        withConnection(ctx, async (connection, pool) => {
          await connection.execute('SET TRANSACTION READ ONLY');
          const binds = { ...ownerBind(input.owner), tableName: input.table };
          const columns = await execute(
            connection,
            pool,
            `SELECT column_id, column_name, data_type, data_length, data_precision, data_scale, nullable ` +
              `FROM all_tab_columns WHERE owner = NVL(:owner, ${CURRENT_SCHEMA}) AND table_name = :tableName ` +
              `ORDER BY column_id`,
            { binds, maxRows: METADATA_MAX_ROWS }
          );
          if (columns.rows.length === 0) {
            throw new Error(
              `Table or view "${input.table}" was not found. Names are case-sensitive and usually uppercase; use listTables to find the exact name.`
            );
          }
          const constraints = await execute(
            connection,
            pool,
            `SELECT c.constraint_name, c.constraint_type, cc.column_name, cc.position, ` +
              `c.r_owner AS referenced_owner, c.r_constraint_name AS referenced_constraint ` +
              `FROM all_constraints c JOIN all_cons_columns cc ` +
              `ON cc.owner = c.owner AND cc.constraint_name = c.constraint_name ` +
              `WHERE c.owner = NVL(:owner, ${CURRENT_SCHEMA}) AND c.table_name = :tableName ` +
              `AND c.constraint_type IN ('P', 'U', 'R') ORDER BY c.constraint_name, cc.position`,
            { binds, maxRows: METADATA_MAX_ROWS }
          );
          return { columns: columns.rows, constraints: constraints.rows };
        }),
    },

    searchRows: {
      isTool: true,
      scope: 'read',
      description:
        'Search for rows in a table by matching a text value against one or more columns using LIKE pattern matching (case-insensitive partial match via LOWER). Returns up to maxRows results (default 100) as { rows, truncated }. Use describeTable first to discover column names. Prefer query for structured filtering; use searchRows for broad text discovery across known columns.',
      input: SearchRowsInputSchema,
      handler: async (ctx, input: SearchRowsInput) => {
        const target = input.owner
          ? `${quoteIdentifier(input.owner)}.${quoteIdentifier(input.table)}`
          : quoteIdentifier(input.table);
        const where = input.columns
          .map((column) => `LOWER(${quoteIdentifier(column)}) LIKE :term ESCAPE '!'`)
          .join(' OR ');
        const term = `%${escapeLikePattern(input.searchTerm.toLowerCase(), false)}%`;
        return runSql(ctx, `SELECT * FROM ${target} WHERE ${where}`, {
          binds: { term },
          maxRows: input.maxRows,
        });
      },
    },

    executeSql: {
      isTool: false,
      scope: 'destroy',
      description:
        'Execute any single SQL or PL/SQL statement against the Oracle database and commit it. No restrictions: INSERT, UPDATE, DELETE, DROP, DDL, and PL/SQL blocks are all permitted. Use only when the workflow explicitly requires a write or destructive operation. Prefer query for read-only access. Returns { rowsAffected }, plus rows when the statement returns any.',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) =>
        withConnection(ctx, async (connection) => {
          const result = await connection.execute(
            stripTrailingSemicolon(input.sql),
            {},
            {
              autoCommit: true,
              maxRows: DEFAULT_MAX_ROWS,
            }
          );
          return { rowsAffected: result.rowsAffected ?? 0, rows: result.rows };
        }),
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.oracle.test.description', {
      defaultMessage: 'Verifies the Oracle connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await runSql(ctx, 'SELECT 1 FROM DUAL');
      return { message: 'Successfully connected to Oracle' };
    },
  },

  skill: [
    '## Oracle Database Connector',
    '',
    'Access to an Oracle database. Read actions (`query`, `searchRows`, `listSchemas`, `listTables`, `describeTable`) are read-only and safe to call freely. `executeSql` is unrestricted: use it only when a write or destructive operation is explicitly required.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listSchemas`: see which schemas exist.',
    "2. `listTables`: list tables and views in a schema (defaults to the connected user's schema if `owner` is omitted).",
    '3. `describeTable`: inspect columns, types, and keys before writing a query.',
    '4. `query` or `searchRows`: read the data.',
    '',
    '### Oracle SQL gotchas',
    '- There is no `LIMIT`. Use `FETCH FIRST 100 ROWS ONLY` at the end of the query. Results are also capped by `maxRows` (default 100, max 1000) and flagged with `truncated: true`.',
    '- Unquoted identifiers are stored uppercase. Use the exact names returned by `listTables` and `describeTable`; a quoted mixed-case name must be quoted in `query` too.',
    '- The database must be Oracle 12.1 or later.',
    "- Qualify tables with their schema (`HR.EMPLOYEES`) when they are not in the connected user's schema.",
    '- Do not end SQL with a semicolon. Use `SELECT 1 FROM DUAL` for expressions with no table.',
    '- Dates come back as ISO timestamps. NUMBER values come back as JavaScript numbers, so integers beyond 2^53 lose precision; cast them to strings with `TO_CHAR` when exact digits matter.',
    '- `query` only allows SELECT and WITH. Multi-statement SQL, `FOR UPDATE`, and `DBMS_*` or `UTL_*` calls are rejected.',
    '- Choose `searchRows` for broad text lookups across known columns and `query` for filtering, joins, and aggregation.',
  ].join('\n'),
};
