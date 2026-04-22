/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Snowflake Connector (v2)
 *
 * Wraps the Snowflake SQL REST API (v2) for arbitrary SQL execution and the
 * Snowflake REST API v2 resource endpoints for metadata discovery and Cortex
 * Search. Actions:
 *  - SQL execution: executeStatement, getStatementStatus, cancelStatement
 *  - Data discovery: listDatabases, listSchemas, listTables, listViews,
 *    describeTable, describeView
 *  - Semantic search: listCortexSearchServices, cortexSearch
 *
 * Auth:
 *  - OAuth 2.0 Authorization Code with PKCE (Snowflake managed OAuth)
 *  - Bearer token (PAT — Snowflake programmatic access token or manually obtained OAuth token)
 *
 * API references:
 *  - SQL API: https://docs.snowflake.com/en/developer-guide/sql-api/reference
 *  - REST API v2: https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/reference
 *  - Cortex Search: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-search/query-cortex-search-service
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import type {
  ExecuteStatementInput,
  GetStatementStatusInput,
  CancelStatementInput,
  ListDatabasesInput,
  ListSchemasInput,
  ListTablesInput,
  ListViewsInput,
  DescribeTableInput,
  DescribeViewInput,
  ListCortexSearchServicesInput,
  CortexSearchInput,
} from './types';
import {
  ExecuteStatementInputSchema,
  GetStatementStatusInputSchema,
  CancelStatementInputSchema,
  ListDatabasesInputSchema,
  ListSchemasInputSchema,
  ListTablesInputSchema,
  ListViewsInputSchema,
  DescribeTableInputSchema,
  DescribeViewInputSchema,
  ListCortexSearchServicesInputSchema,
  CortexSearchInputSchema,
} from './types';

const SNOWFLAKE_SQL_API_PATH = '/api/v2/statements';
const SNOWFLAKE_REST_API_V2 = '/api/v2';
const SNOWFLAKE_USER_AGENT = 'Kibana-Snowflake-Connector/1.0';

const buildListParams = (input: {
  like?: string;
  startsWith?: string;
  showLimit?: number;
  fromName?: string;
}): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  if (input.like !== undefined) params.like = input.like;
  if (input.startsWith !== undefined) params.startsWith = input.startsWith;
  if (input.showLimit !== undefined) params.showLimit = input.showLimit;
  if (input.fromName !== undefined) params.fromName = input.fromName;
  return params;
};

export const Snowflake: ConnectorSpec = {
  metadata: {
    id: '.snowflake',
    displayName: 'Snowflake',
    description: i18n.translate('core.kibanaConnectorSpecs.snowflake.metadata.description', {
      defaultMessage:
        'Execute SQL, discover databases, schemas, tables and views, and run semantic searches via Cortex Search in Snowflake',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {
          token: '',
        },
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.snowflake.auth.pat.label', {
                defaultMessage: 'Snowflake access token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.auth.pat.helpText', {
                defaultMessage:
                  'A Snowflake programmatic access token (PAT) or manually obtained OAuth access token.',
              }),
            },
          },
        },
      },
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: '',
          tokenUrl: '',
          scope: '',
          useBasicAuth: true,
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://<account>.snowflakecomputing.com/oauth/authorize',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.snowflake.auth.oauth.authorizationUrl.helpText',
                {
                  defaultMessage:
                    'Snowflake OAuth authorization URL. Replace <account> with your Snowflake account identifier.',
                }
              ),
            },
            tokenUrl: {
              placeholder: 'https://<account>.snowflakecomputing.com/oauth/token-request',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.snowflake.auth.oauth.tokenUrl.helpText',
                {
                  defaultMessage:
                    'Snowflake OAuth token endpoint. Replace <account> with your Snowflake account identifier.',
                }
              ),
            },
            scope: {
              hidden: true,
            },
          },
        },
      },
    ],
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': SNOWFLAKE_USER_AGENT,
    },
  },

  schema: z.object({
    accountUrl: z
      .url()
      .transform((val) => val.replace(/\/+$/, ''))
      .describe('Snowflake account URL')
      .meta({
        widget: 'text',
        placeholder: 'https://<account>.snowflakecomputing.com',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.accountUrl.label', {
          defaultMessage: 'Snowflake Account URL',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.accountUrl.helpText', {
          defaultMessage:
            'The base URL for your Snowflake account (e.g. https://myorg-myaccount.snowflakecomputing.com).',
        }),
      }),
    warehouse: z
      .string()
      .optional()
      .describe('Default warehouse for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'COMPUTE_WH',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.warehouse.label', {
          defaultMessage: 'Default Warehouse',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.warehouse.helpText', {
          defaultMessage:
            'Default warehouse to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
    database: z
      .string()
      .optional()
      .describe('Default database for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'MY_DATABASE',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.database.label', {
          defaultMessage: 'Default Database',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.database.helpText', {
          defaultMessage:
            'Default database to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
    defaultSchema: z
      .string()
      .optional()
      .describe('Default schema for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'PUBLIC',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.schema.label', {
          defaultMessage: 'Default Schema',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.schema.helpText', {
          defaultMessage:
            'Default schema to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
    role: z
      .string()
      .optional()
      .describe('Default role for SQL execution')
      .meta({
        widget: 'text',
        placeholder: 'PUBLIC',
        label: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.role.label', {
          defaultMessage: 'Default Role',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.snowflake.config.role.helpText', {
          defaultMessage:
            'Default role to use when executing statements. Case-sensitive. Can be overridden per request.',
        }),
      }),
  }),

  validateUrls: {
    fields: ['accountUrl'],
  },

  actions: {
    executeStatement: {
      isTool: true,
      description:
        'Execute a SQL statement asynchronously in Snowflake. Returns immediately with a statement handle that can be used to poll for results via getStatementStatus or cancel via cancelStatement. Supports bind variables, multi-statement execution, and session-scoped context (warehouse, database, schema, role). Always executes asynchronously — use getStatementStatus to retrieve results.',
      input: ExecuteStatementInputSchema,
      handler: async (ctx, input: ExecuteStatementInput) => {
        const {
          accountUrl,
          warehouse: defaultWarehouse,
          database: defaultDatabase,
          defaultSchema,
          role: defaultRole,
        } = ctx.config as {
          accountUrl: string;
          warehouse?: string;
          database?: string;
          defaultSchema?: string;
          role?: string;
        };

        const body: Record<string, unknown> = {
          statement: input.statement,
        };

        if (input.timeout !== undefined) body.timeout = input.timeout;
        if (input.bindings) body.bindings = input.bindings;

        const warehouse = input.warehouse ?? defaultWarehouse;
        const database = input.database ?? defaultDatabase;
        const schema = input.schema ?? defaultSchema;
        const role = input.role ?? defaultRole;

        if (warehouse) body.warehouse = warehouse;
        if (database) body.database = database;
        if (schema) body.schema = schema;
        if (role) body.role = role;

        if (input.multiStatementCount !== undefined) {
          body.parameters = {
            ...(body.parameters as Record<string, unknown> | undefined),
            MULTI_STATEMENT_COUNT: String(input.multiStatementCount),
          };
        }
        if (input.queryTag) {
          body.parameters = {
            ...(body.parameters as Record<string, unknown> | undefined),
            QUERY_TAG: input.queryTag,
          };
        }

        const url = `${accountUrl}${SNOWFLAKE_SQL_API_PATH}`;

        const response = await ctx.client.post(url, body, {
          params: { async: true },
          validateStatus: (status) => status === 200 || status === 202,
        });

        return response.data;
      },
    },

    getStatementStatus: {
      isTool: true,
      description:
        'Check the status of a previously submitted SQL statement and retrieve results if execution is complete. Returns HTTP 200 with a ResultSet when finished, or HTTP 202 with a QueryStatus if still running. Use the statementHandle from the executeStatement response. For large result sets, use the partition parameter to page through data.',
      input: GetStatementStatusInputSchema,
      handler: async (ctx, input: GetStatementStatusInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };

        const params: Record<string, unknown> = {};
        if (input.partition !== undefined) params.partition = input.partition;

        const url = `${accountUrl}${SNOWFLAKE_SQL_API_PATH}/${input.statementHandle}`;

        const response = await ctx.client.get(url, {
          params,
          validateStatus: (status) => status === 200 || status === 202,
        });

        return response.data;
      },
    },

    cancelStatement: {
      isTool: true,
      description:
        'Cancel a running SQL statement in Snowflake. Use the statementHandle from the executeStatement response. Returns a confirmation with the cancellation status. Only works on statements that are still executing.',
      input: CancelStatementInputSchema,
      handler: async (ctx, input: CancelStatementInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };

        const url = `${accountUrl}${SNOWFLAKE_SQL_API_PATH}/${input.statementHandle}/cancel`;

        const response = await ctx.client.post(
          url,
          {},
          {
            validateStatus: (status) => status === 200 || status === 422,
          }
        );

        return response.data;
      },
    },

    listDatabases: {
      isTool: true,
      description:
        'List Snowflake databases visible to the connector\'s role. Returns JSON objects (not SQL row arrays) with name, kind, owner, comment, created_on, and other metadata. Does not require a warehouse. Use this as the starting point for data discovery when the target database is unknown. Supports case-insensitive name filtering via "like" (SQL wildcards) and case-sensitive prefix filtering via "startsWith".',
      input: ListDatabasesInputSchema,
      handler: async (ctx, input: ListDatabasesInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };
        const params = buildListParams(input);
        if (input.history !== undefined) params.history = input.history;

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases`;
        const response = await ctx.client.get(url, { params });
        return response.data;
      },
    },

    listSchemas: {
      isTool: true,
      description:
        'List schemas inside a Snowflake database. Returns JSON objects with name, database_name, owner, comment, and other metadata. Does not require a warehouse. Use after listDatabases to narrow down the target before listing tables or views. Database name is case-sensitive and must match exactly what listDatabases returned.',
      input: ListSchemasInputSchema,
      handler: async (ctx, input: ListSchemasInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };
        const params = buildListParams(input);

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas`;
        const response = await ctx.client.get(url, { params });
        return response.data;
      },
    },

    listTables: {
      isTool: true,
      description:
        'List tables inside a Snowflake schema. Returns JSON objects with name, database_name, schema_name, kind, rows, bytes, cluster_by, comment, and other metadata. Does not require a warehouse. Use after listSchemas to find the specific table to describe or query. Database and schema names are case-sensitive. Optional: "history" to include dropped tables.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };
        const params = buildListParams(input);
        if (input.history !== undefined) params.history = input.history;

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas/${encodeURIComponent(input.schema)}/tables`;
        const response = await ctx.client.get(url, { params });
        return response.data;
      },
    },

    listViews: {
      isTool: true,
      description:
        "List views inside a Snowflake schema. Returns JSON objects with name, database_name, schema_name, owner, comment, and other metadata. Does not require a warehouse. Database and schema names are case-sensitive. Use describeView to retrieve a view's columns and underlying query text.",
      input: ListViewsInputSchema,
      handler: async (ctx, input: ListViewsInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };
        const params = buildListParams(input);

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas/${encodeURIComponent(input.schema)}/views`;
        const response = await ctx.client.get(url, { params });
        return response.data;
      },
    },

    describeTable: {
      isTool: true,
      description:
        'Get the full definition of a Snowflake table, including columns (name, type, nullable, default, comment), clustering keys, row count, size in bytes, owner, and other metadata. Returns a clean JSON Table object (not SQL row arrays). Does not require a warehouse. Use this before executeStatement to build correct SELECT, INSERT, UPDATE, or JOIN queries. Database, schema, and table names are all case-sensitive.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas/${encodeURIComponent(input.schema)}/tables/${encodeURIComponent(input.name)}`;
        const response = await ctx.client.get(url);
        return response.data;
      },
    },

    describeView: {
      isTool: true,
      description:
        'Get the full definition of a Snowflake view, including columns, the underlying SELECT query text, owner, comment, and other metadata. Returns a clean JSON View object. Does not require a warehouse. Use to understand what a view exposes before querying it or building dependent logic. Database, schema, and view names are all case-sensitive.',
      input: DescribeViewInputSchema,
      handler: async (ctx, input: DescribeViewInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas/${encodeURIComponent(input.schema)}/views/${encodeURIComponent(input.name)}`;
        const response = await ctx.client.get(url);
        return response.data;
      },
    },

    listCortexSearchServices: {
      isTool: true,
      description:
        'List Cortex Search services defined in a Snowflake schema. Cortex Search provides semantic + lexical search over indexed text columns. Returns JSON objects with name, database_name, schema_name, target_lag, warehouse, comment, and the underlying source query. Use before cortexSearch to discover what search services are available. Database and schema names are case-sensitive.',
      input: ListCortexSearchServicesInputSchema,
      handler: async (ctx, input: ListCortexSearchServicesInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };
        const params = buildListParams(input);

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas/${encodeURIComponent(input.schema)}/cortex-search-services`;
        const response = await ctx.client.get(url, { params });
        return response.data;
      },
    },

    cortexSearch: {
      isTool: true,
      description:
        'Run a natural-language query against a Snowflake Cortex Search service. Cortex Search performs hybrid semantic + lexical matching over the service\'s indexed search column and returns ranked results as JSON. Use for unstructured text retrieval (support docs, product catalogs, chat logs) — much better than LIKE or CONTAINS in SQL. Supports additional attribute filtering via the "filter" DSL (@eq, @contains, @gte, @lte, @and, @or, @not). Example filter: {"@and": [{"@eq": {"REGION": "US"}}, {"@gte": {"YEAR": 2024}}]}. Prefer limit<=20 to keep LLM context small.',
      input: CortexSearchInputSchema,
      handler: async (ctx, input: CortexSearchInput) => {
        const { accountUrl } = ctx.config as { accountUrl: string };

        const body: Record<string, unknown> = { query: input.query };
        if (input.columns !== undefined) body.columns = input.columns;
        if (input.filter !== undefined) body.filter = input.filter;
        if (input.limit !== undefined) body.limit = input.limit;

        const url = `${accountUrl}${SNOWFLAKE_REST_API_V2}/databases/${encodeURIComponent(
          input.database
        )}/schemas/${encodeURIComponent(input.schema)}/cortex-search-services/${encodeURIComponent(
          input.serviceName
        )}:query`;
        const response = await ctx.client.post(url, body);
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.snowflake.test.description', {
      defaultMessage:
        'Verifies connection to Snowflake by executing SELECT CURRENT_VERSION() and returning the result.',
    }),
    handler: async (ctx) => {
      const { accountUrl } = ctx.config as { accountUrl: string };
      const url = `${accountUrl}${SNOWFLAKE_SQL_API_PATH}`;

      const response = await ctx.client.post(
        url,
        { statement: 'SELECT CURRENT_VERSION()' },
        {
          validateStatus: (status) => status === 200 || status === 202,
        }
      );

      if (response.status === 200 && response.data?.data) {
        return {
          ok: true,
          message: `Connected to Snowflake. Version: ${response.data.data[0]?.[0] ?? 'unknown'}`,
        };
      }

      return {
        ok: true,
        message: `Connected to Snowflake. Statement submitted (handle: ${
          response.data?.statementHandle ?? 'unknown'
        }).`,
      };
    },
  },

  skill: [
    '## Snowflake Connector',
    '',
    'This connector exposes three capability groups against Snowflake:',
    '',
    '1. **SQL execution** — `executeStatement`, `getStatementStatus`, `cancelStatement` (Snowflake SQL REST API).',
    '2. **Data discovery** — `listDatabases`, `listSchemas`, `listTables`, `listViews`, `describeTable`, `describeView` (Snowflake REST API v2 resources).',
    '3. **Semantic search** — `listCortexSearchServices`, `cortexSearch` (Cortex Search).',
    '',
    '### Discovery pattern (agents without prior knowledge)',
    'When the target database, schema, or table is unknown, discover before querying:',
    '',
    '1. `listDatabases` → pick a database.',
    '2. `listSchemas` for that database → pick a schema.',
    '3. `listTables` (or `listViews`) for that schema → pick an object.',
    '4. `describeTable` (or `describeView`) to learn its columns, types, and constraints.',
    '5. `executeStatement` to run the actual SELECT / INSERT / etc. — now you can build correct, well-scoped SQL.',
    '',
    'Discovery actions hit REST v2 resource endpoints. They return clean JSON (not SQL row arrays), do not require a warehouse, and are cheaper than firing `SHOW` / `DESCRIBE` through `executeStatement`. Prefer them over SQL equivalents whenever possible. Use `executeStatement` as the escape hatch for anything REST v2 does not expose (grants, users, stages, functions, procedures, tasks, pipes, etc.).',
    '',
    '### Semantic search pattern',
    'For unstructured text retrieval (product catalogs, support docs, chat logs), use Cortex Search instead of `LIKE`/`CONTAINS` in SQL:',
    '',
    '1. `listCortexSearchServices` for the target schema → pick a service.',
    '2. `cortexSearch` with a natural-language `query`. Optionally restrict results with `filter` (operators: `@eq`, `@contains`, `@gte`, `@lte`, `@and`, `@or`, `@not`) and request extra columns via `columns`.',
    '',
    'Prefer `limit <= 20` and request only the columns you actually need to keep LLM context small.',
    '',
    '### SQL execution pattern',
    '1. Call `executeStatement` with your SQL. It returns a `statementHandle`.',
    '2. Call `getStatementStatus` with that handle to poll for results.',
    '   - HTTP 202 means still running — wait and poll again.',
    '   - HTTP 200 means complete — the response contains `data` (array of row arrays) and `resultSetMetaData` (column definitions).',
    '3. If the query is no longer needed, call `cancelStatement` with the handle.',
    '',
    '### Multi-statement execution',
    'Separate statements with semicolons and set `multiStatementCount` to the number of statements (or 0 for variable count). The response includes `statementHandles` for each individual statement.',
    '',
    '### Bind variables',
    'Use `?` placeholders in the SQL and provide `bindings` with 1-based keys. All binding values are strings. Example: `{"1": {"type": "TEXT", "value": "hello"}}`.',
    '',
    '### Context defaults',
    'The connector config provides default warehouse, database, schema, and role. Per-request values in executeStatement override these defaults. Discovery actions require the database / schema to be passed explicitly — they do not fall back to the config defaults.',
    '',
    '### Result set pagination',
    'Large SQL result sets are split into partitions by Snowflake. Use `getStatementStatus` with different `partition` values (0-based) to retrieve each partition. The `resultSetMetaData.partitionInfo` array describes the row count and size of each partition. List endpoints paginate via `fromName` (cursor) + `showLimit`.',
    '',
    '### Important notes',
    '- Snowflake identifiers (database, schema, table, view, warehouse, role, Cortex Search service) are case-sensitive and must match the casing returned by the list endpoints.',
    '- Discovery actions and Cortex Search do not require a warehouse. Only `executeStatement` (and therefore `getStatementStatus` / `cancelStatement`) does.',
    '- `like` uses SQL wildcards (`%`, `_`) and is case-insensitive. `startsWith` is a literal prefix and case-sensitive.',
    '- The SQL API does not support all Snowflake SQL — see Snowflake docs for limitations.',
    '- Bind variables are not supported in multi-statement requests.',
  ].join('\n'),
};
