/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * AWS RDS Connector
 *
 * Runs SQL against Amazon Aurora (MySQL and PostgreSQL) clusters through the
 * RDS Data API (`POST https://rds-data.{region}.amazonaws.com/Execute`). The
 * Data API is the only HTTP SQL interface AWS offers for RDS; it is limited to
 * Aurora clusters with the Data API enabled. Requests are signed with SigV4 by
 * the `aws_credentials` auth type, and the database credentials live in AWS
 * Secrets Manager (referenced by `secretArn`), never in Kibana.
 *
 * `query` accepts SELECT/WITH only (enforced by `assertReadOnly`). The Data API
 * has no read-only mode, so use a read-only database user in the secret.
 * `executeSql` is unrestricted and carries `scope: 'destroy'`.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertReadOnly, SELECT_OR_WITH_PREFIX } from '../../lib/generic_db_connector';
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
} from './types';

const DEFAULT_MAX_ROWS = 100;
const SCHEMA_MAX_ROWS = 2000;
const DEFAULT_PG_SCHEMA = 'public';
// SELECT ... INTO creates a table in PostgreSQL, which the shared write pattern does not catch.
const SELECT_INTO_PATTERN = /\bINTO\b/i;
const REGION_PATTERN = /^[a-z]{2}(-[a-z0-9]+)+$/;
const CLUSTER_ARN_PATTERN = /^arn:aws[a-z-]*:rds:[a-z0-9-]+:\d{12}:cluster:[A-Za-z0-9._-]+$/;
const SECRET_ARN_PATTERN = /^arn:aws[a-z-]*:secretsmanager:[a-z0-9-]+:\d{12}:secret:[\w/+=.@!-]+$/;

type Engine = 'mysql' | 'postgresql';

interface AwsRdsConfig {
  region: string;
  clusterArn: string;
  secretArn: string;
  database?: string;
  engine: Engine;
}

interface SqlParameter {
  name: string;
  value: { stringValue: string };
}

interface ExecuteStatementResponse {
  formattedRecords?: string;
  numberOfRecordsUpdated?: number;
}

interface ExecuteResult {
  rows: Array<Record<string, unknown>>;
  numberOfRecordsUpdated?: number;
}

const getConfig = (ctx: ActionContext): AwsRdsConfig => ctx.config as unknown as AwsRdsConfig;

export const AwsRds: ConnectorSpec = {
  metadata: {
    id: '.aws_rds',
    displayName: 'AWS RDS',
    description: i18n.translate('core.kibanaConnectorSpecs.awsRds.metadata.description', {
      defaultMessage:
        'Query tables, explore schema, and execute SQL in Amazon Aurora databases through the RDS Data API',
    }),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features such as 'workflows'; add them in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['aws_credentials'],
  },

  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .max(30)
        .regex(REGION_PATTERN, 'Must be an AWS region such as us-east-1')
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.awsRds.config.region.description', {
            defaultMessage: 'The AWS Region of the Aurora cluster',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          placeholder: 'us-east-1',
        }),
      clusterArn: z
        .string()
        .min(11)
        .max(100)
        .regex(CLUSTER_ARN_PATTERN, 'Must be an Aurora DB cluster ARN')
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.awsRds.config.clusterArn.description', {
            defaultMessage: 'The ARN of the Aurora DB cluster',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.clusterArn.label', {
            defaultMessage: 'DB cluster ARN',
          }),
          placeholder: 'arn:aws:rds:us-east-1:123456789012:cluster:my-cluster',
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.clusterArn.helpText', {
            defaultMessage:
              'The Aurora DB cluster must have the RDS Data API enabled. The IAM user needs rds-data:ExecuteStatement on this cluster.',
          }),
        }),
      secretArn: z
        .string()
        .min(11)
        .max(100)
        .regex(SECRET_ARN_PATTERN, 'Must be a Secrets Manager secret ARN')
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.awsRds.config.secretArn.description', {
            defaultMessage:
              'The ARN of the Secrets Manager secret holding the database credentials',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.secretArn.label', {
            defaultMessage: 'Secret ARN',
          }),
          placeholder: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-db-secret-AbCdEf',
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.secretArn.helpText', {
            defaultMessage:
              'The secret holds the database username and password. Use a read-only database user unless writes are needed. The IAM user needs secretsmanager:GetSecretValue on this secret.',
          }),
        }),
      engine: z
        .enum(['mysql', 'postgresql'])
        .default('mysql')
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.awsRds.config.engine.description', {
            defaultMessage: 'The database engine of the Aurora cluster',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.engine.label', {
            defaultMessage: 'Engine',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.engine.helpText', {
            defaultMessage:
              'Aurora MySQL or Aurora PostgreSQL. Used to pick the right schema discovery queries.',
          }),
        }),
      database: z
        .string()
        .min(1)
        .max(64)
        .optional()
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.awsRds.config.database.description', {
            defaultMessage: 'The default database to run SQL in',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.database.label', {
            defaultMessage: 'Database',
          }),
          placeholder: 'my_database',
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsRds.config.database.helpText', {
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
        'Execute a read-only SQL SELECT query against the Aurora database. ' +
        'Only SELECT and WITH statements are permitted; INSERT, UPDATE, DELETE and DDL are blocked. ' +
        'Include a LIMIT clause (e.g. LIMIT 100) because the Data API fails any response over 1 MiB. ' +
        'Do not include a trailing semicolon. ' +
        'Use listTables and describeTable first to learn table and column names. ' +
        'Returns { rows, truncated } where rows is an array of objects keyed by column name.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        assertReadOnly(input.sql, SELECT_OR_WITH_PREFIX, SELECT_INTO_PATTERN);
        const maxRows = input.maxRows ?? DEFAULT_MAX_ROWS;
        const { rows } = await executeStatement(ctx, input.sql, { database: input.database });
        return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows };
      },
    },

    listDatabases: {
      isTool: true,
      scope: 'read',
      description:
        'List the databases on the Aurora cluster. ' +
        'Use this first to discover which databases are available before listing tables. ' +
        'Returns { rows } with a database_name column.',
      input: ListDatabasesInputSchema,
      handler: async (ctx) => {
        const sql =
          getConfig(ctx).engine === 'mysql'
            ? 'SELECT schema_name AS database_name FROM information_schema.schemata ORDER BY schema_name'
            : 'SELECT datname AS database_name FROM pg_database WHERE NOT datistemplate AND datallowconn ORDER BY datname';
        const { rows } = await executeStatement(ctx, sql);
        return { rows };
      },
    },

    listTables: {
      isTool: true,
      scope: 'read',
      description:
        'List the tables and views in a database (MySQL) or schema (PostgreSQL). ' +
        'Use describeTable to inspect the columns of a table before querying it. ' +
        'Returns { rows } with table_name and table_type (BASE TABLE or VIEW).',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const schemaName = resolveSchemaName(ctx, input.database, input.schema);
        const { rows } = await executeStatement(
          ctx,
          'SELECT table_name AS table_name, table_type AS table_type FROM information_schema.tables ' +
            'WHERE table_schema = :schema_name ORDER BY table_name',
          { database: input.database, parameters: stringParams({ schema_name: schemaName }) }
        );
        return { rows };
      },
    },

    describeTable: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a table or view: returns its columns (name, data type, nullability, default, position) ' +
        'and its primary key, unique and foreign key constraints. ' +
        'Use this before query to discover column names and types. ' +
        'Returns { columns, constraints }.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const schemaName = resolveSchemaName(ctx, input.database, input.schema);
        const parameters = stringParams({ schema_name: schemaName, table_name: input.table });
        const { rows: columns } = await executeStatement(
          ctx,
          'SELECT column_name AS column_name, data_type AS data_type, is_nullable AS is_nullable, ' +
            'column_default AS column_default, ordinal_position AS ordinal_position ' +
            'FROM information_schema.columns WHERE table_schema = :schema_name AND table_name = :table_name ' +
            'ORDER BY ordinal_position',
          { database: input.database, parameters }
        );
        if (columns.length === 0) {
          throw new Error(
            `Table "${input.table}" was not found in "${schemaName}". Use listTables to see available tables.`
          );
        }
        const { rows: constraints } = await executeStatement(
          ctx,
          'SELECT tc.constraint_name AS constraint_name, tc.constraint_type AS constraint_type, ' +
            '  kcu.column_name AS column_name FROM information_schema.table_constraints tc ' +
            'JOIN information_schema.key_column_usage kcu ON kcu.constraint_schema = tc.constraint_schema ' +
            ' AND kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name ' +
            ' WHERE tc.table_schema = :schema_name AND tc.table_name = :table_name ' +
            'ORDER BY tc.constraint_name, kcu.ordinal_position',
          { database: input.database, parameters }
        );
        return { columns, constraints };
      },
    },

    getSchema: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve the columns of every table and view in a database (MySQL) or schema (PostgreSQL) in one call. ' +
        'Use this to get an overview of the data model when you do not yet know which table to look at; ' +
        'use describeTable for one table in more detail. ' +
        'Returns { tables, truncated } where tables maps each table name to its columns. ' +
        `Capped at ${SCHEMA_MAX_ROWS} columns.`,
      input: GetSchemaInputSchema,
      handler: async (ctx, input: GetSchemaInput) => {
        const schemaName = resolveSchemaName(ctx, input.database, input.schema);
        const { rows } = await executeStatement(
          ctx,
          `SELECT table_name AS table_name, column_name AS column_name, data_type AS data_type, is_nullable AS is_nullable FROM information_schema.columns WHERE table_schema = :schema_name ORDER BY table_name, ordinal_position LIMIT ${
            SCHEMA_MAX_ROWS + 1
          }`,
          { database: input.database, parameters: stringParams({ schema_name: schemaName }) }
        );
        const tables: Record<string, Array<Record<string, unknown>>> = {};
        for (const { table_name: tableName, ...column } of rows.slice(0, SCHEMA_MAX_ROWS)) {
          (tables[String(tableName)] ??= []).push(column);
        }
        return { tables, truncated: rows.length > SCHEMA_MAX_ROWS };
      },
    },

    executeSql: {
      isTool: true,
      scope: 'destroy',
      description:
        'WARNING: this action can modify or permanently delete data. ' +
        'Execute any SQL statement against the Aurora database. ' +
        'No restrictions: INSERT, UPDATE, DELETE, DROP and DDL are all permitted and are committed automatically. ' +
        'Use only when the user explicitly asks for a write or destructive operation. ' +
        'Prefer query for read-only access. ' +
        'Returns { rows, numberOfRecordsUpdated }.',
      input: ExecuteSqlInputSchema,
      handler: async (ctx, input: ExecuteSqlInput) =>
        executeStatement(ctx, input.sql, { database: input.database }),
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.awsRds.test.description', {
      defaultMessage: 'Verifies the RDS Data API connection by running a lightweight query',
    }),
    enabled: true,
    handler: async (ctx) => {
      await executeStatement(ctx, 'SELECT 1');
      return { message: 'Successfully connected to Aurora through the RDS Data API' };
    },
  },

  skill: [
    '## AWS RDS Connector',
    '',
    'SQL access to an Amazon Aurora (MySQL or PostgreSQL) cluster through the RDS Data API. Read actions (`query`, `listDatabases`, `listTables`, `describeTable`, `getSchema`) are read-only. `executeSql` is unrestricted; use it only when the user explicitly asks for a write or destructive operation, and confirm the exact statement first.',
    '',
    '### Discovery pattern (schema unknown)',
    '1. `listDatabases` to see what databases exist.',
    '2. `getSchema` for an overview of every table and column, or `listTables` then `describeTable` for one table.',
    '3. `query` to read the data, using the exact table and column names returned above.',
    '',
    '### Gotchas',
    '- Write SQL for the cluster engine: MySQL uses backticks to quote identifiers, PostgreSQL uses double quotes.',
    '- `query` only allows SELECT and WITH; multi-statement SQL and anything containing INTO are rejected.',
    '- Always include a `LIMIT`. The Data API terminates any call whose response exceeds 1 MiB, and `maxRows` only trims the result after it arrives.',
    '- PostgreSQL scopes tables by schema (default `public`); pass `schema` to list or describe tables elsewhere. To work in another database, pass `database`.',
    '- Only Aurora clusters with the Data API enabled are supported. Other RDS engines (standard RDS for PostgreSQL, MySQL, MariaDB, SQL Server) cannot be reached.',
    '- A `DatabaseResumingException` means an Aurora Serverless instance is waking from pause; retry after a few seconds.',
  ].join('\n'),
};

const toErrorMessage = (error: unknown): string => {
  const { response, message } = error as {
    response?: { status?: number; data?: { message?: string }; headers?: Record<string, string> };
    message: string;
  };
  if (!response) {
    return `AWS RDS Data API request failed: ${message}`;
  }
  const errorType = response.headers?.['x-amzn-errortype']?.split(':')[0] ?? 'UnknownError';
  return `AWS RDS Data API error [${errorType}]: ${
    response.data?.message ?? `HTTP ${response.status}`
  }`;
};

const executeStatement = async (
  ctx: ActionContext,
  sql: string,
  options: { database?: string; parameters?: SqlParameter[] } = {}
): Promise<ExecuteResult> => {
  const { region, clusterArn, secretArn, database: defaultDatabase } = getConfig(ctx);
  const database = options.database ?? defaultDatabase;
  const body = JSON.stringify({
    resourceArn: clusterArn,
    secretArn,
    sql,
    formatRecordsAs: 'JSON',
    ...(database ? { database } : {}),
    ...(options.parameters ? { parameters: options.parameters } : {}),
  });

  let data: ExecuteStatementResponse;
  try {
    ({ data } = await ctx.client.post<ExecuteStatementResponse>(
      `https://rds-data.${region}.amazonaws.com/Execute`,
      body,
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error: unknown) {
    throw new Error(toErrorMessage(error));
  }

  let rows: ExecuteResult['rows'] = [];
  if (data.formattedRecords) {
    try {
      rows = JSON.parse(data.formattedRecords);
    } catch {
      throw new Error('AWS RDS Data API returned a result set that could not be parsed as JSON');
    }
  }
  return { rows, numberOfRecordsUpdated: data.numberOfRecordsUpdated };
};

const stringParams = (params: Record<string, string>): SqlParameter[] =>
  Object.entries(params).map(([name, value]) => ({ name, value: { stringValue: value } }));

const resolveDatabase = (inputDb: string | undefined, ctx: ActionContext): string => {
  const db = inputDb ?? getConfig(ctx).database;
  if (!db) {
    throw new Error(
      'No database specified and no default database is configured for this connector'
    );
  }
  return db;
};

// MySQL treats the database as the schema; PostgreSQL scopes by schema within the connected database.
const resolveSchemaName = (
  ctx: ActionContext,
  database: string | undefined,
  schema: string | undefined
): string =>
  getConfig(ctx).engine === 'mysql' ? resolveDatabase(database, ctx) : schema ?? DEFAULT_PG_SCHEMA;
