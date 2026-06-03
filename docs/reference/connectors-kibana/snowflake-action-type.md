---
navigation_title: "Snowflake"
type: reference
description: "Use the Snowflake connector to run SQL, discover databases, schemas, tables, and views, and run semantic searches through Cortex Search."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Snowflake connector [snowflake-action-type]

The Snowflake connector wraps the [Snowflake SQL REST API](https://docs.snowflake.com/en/developer-guide/sql-api/reference), the [Snowflake REST API v2](https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/reference), and [Cortex Search](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-search/query-cortex-search-service). Use it to run read-only SQL queries, discover databases, schemas, tables, and views, describe their structure, and run semantic searches through Cortex Search. Workflow authors can also run write and DDL statements through a separate action that is not exposed to AI agents.

## Create connectors in {{kib}} [define-snowflake-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [snowflake-connector-configuration]

Snowflake connectors have the following configuration properties:

Snowflake Account URL
:   The base URL for your Snowflake account (for example, `https://myorg-myaccount.snowflakecomputing.com`).

Default Warehouse
:   (Optional) The default warehouse to use for SQL execution. Case-sensitive. Can be overridden per request.

Default Database
:   (Optional) The default database to use for SQL execution. Case-sensitive. Can be overridden per request.

Default Schema
:   (Optional) The default schema to use for SQL execution. Case-sensitive. Can be overridden per request.

Default Role
:   (Optional) The default role to use for SQL execution. Case-sensitive. Can be overridden per request.

## Test connectors [snowflake-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by running `SELECT CURRENT_VERSION()` and returning the Snowflake version.

The Snowflake connector has the following actions:

Run query
:   Run a read-only SQL query asynchronously in Snowflake. Accepts `SELECT`, `WITH` (CTE), `SHOW`, `DESCRIBE` / `DESC`, and `EXPLAIN` only. Write operations (`INSERT`, `UPDATE`, `DELETE`, `MERGE`), DDL (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`), privilege changes (`GRANT`, `REVOKE`), stored procedure calls (`CALL`), and session-state changes (`USE`, `SET`) are rejected before the request is sent. Returns a statement handle for polling results through *Get statement status* or aborting through *Cancel statement*.
    - `statement` (required): Read-only SQL statement. Use `?` placeholders for bind variables. Single-statement only — semicolon-delimited multi-statement submissions are rejected.
    - `timeout` (optional): Timeout in seconds (0–604800). Set to 0 for the maximum timeout of 7 days.
    - `warehouse` (optional): Warehouse override for this request.
    - `database` (optional): Database override for this request.
    - `schema` (optional): Schema override for this request.
    - `role` (optional): Role override for this request.
    - `bindings` (optional): Bind variable values keyed by 1-based position. Each value has a `type` (Snowflake data type) and `value` (string representation).
    - `queryTag` (optional): Tag for tracking in Snowflake query history.

Execute statement
:   Run any SQL statement asynchronously in Snowflake. This action is available to workflow authors and direct API callers only — it is not exposed to AI agents. Use it for write (`INSERT`, `UPDATE`, `DELETE`, `MERGE`), DDL (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`), privilege changes, stored procedure calls, or multi-statement requests. Returns a statement handle for polling results or cancellation.
    - `statement` (required): SQL statement to run. Supports any Snowflake SQL. Use `?` placeholders for bind variables.
    - `timeout` (optional): Timeout in seconds (0–604800). Set to 0 for the maximum timeout of 7 days.
    - `warehouse` (optional): Warehouse override for this request.
    - `database` (optional): Database override for this request.
    - `schema` (optional): Schema override for this request.
    - `role` (optional): Role override for this request.
    - `bindings` (optional): Bind variable values keyed by 1-based position. Each value has a `type` (Snowflake data type) and `value` (string representation).
    - `multiStatementCount` (optional): Number of SQL statements when using multi-statement execution. Required for more than one statement.
    - `queryTag` (optional): Tag for tracking in Snowflake query history.

Get statement status
:   Check the status of a previously submitted SQL statement and retrieve results if complete. Returns the full result set when the statement has finished, or a status message if still running.
    - `statementHandle` (required): The statement handle returned by *Run query* or *Execute statement*.
    - `partition` (optional): Partition number (0-based) for large result sets split across multiple partitions.

Cancel statement
:   Cancel a running SQL statement. Only works on statements that are still running.
    - `statementHandle` (required): The statement handle of the running statement to cancel.

List databases
:   List Snowflake databases visible to the connector's role. Returns JSON objects (not SQL row arrays). Does not require a warehouse.
    - `like` (optional): Case-insensitive SQL pattern (for example, `PROD%`, `%_LOG`) to filter by database name.
    - `startsWith` (optional): Case-sensitive prefix filter on the database name.
    - `showLimit` (optional): Maximum number of rows to return (1–10000). Prefer `<=100` to keep results small. When omitted, Snowflake applies a server-side default.
    - `fromName` (optional): Cursor for pagination. Returns only rows whose name sorts after this value.
    - `history` (optional): If `true`, include dropped databases that have not yet been purged.

List schemas
:   List schemas inside a database. Returns JSON objects with name, owner, comment, and other metadata. Does not require a warehouse.
    - `database` (required): Case-sensitive database name (for example, `PROD_DB`).
    - `like`, `startsWith`, `showLimit`, `fromName` (optional): Same semantics as *List databases*.

List tables
:   List tables inside a schema. Returns JSON objects with name, kind, row count, byte size, clustering, comment, and other metadata. Does not require a warehouse.
    - `database` (required): Case-sensitive database name.
    - `schema` (required): Case-sensitive schema name.
    - `like`, `startsWith`, `showLimit`, `fromName` (optional): Same semantics as *List databases*.
    - `history` (optional): If `true`, include dropped tables that have not yet been purged.

List views
:   List views inside a schema. Returns JSON objects with name, owner, comment, and other metadata. Does not require a warehouse.
    - `database` (required): Case-sensitive database name.
    - `schema` (required): Case-sensitive schema name.
    - `like`, `startsWith`, `showLimit`, `fromName` (optional): Same semantics as *List databases*.

Describe table
:   Return a full `Table` object including columns (name, type, nullable, default, comment), clustering keys, row count, and byte size. Does not require a warehouse.
    - `database` (required): Case-sensitive database name.
    - `schema` (required): Case-sensitive schema name.
    - `name` (required): Case-sensitive table name.

Describe view
:   Return a full `View` object including columns and the underlying SELECT query text. Does not require a warehouse.
    - `database` (required): Case-sensitive database name.
    - `schema` (required): Case-sensitive schema name.
    - `name` (required): Case-sensitive view name.

List Cortex Search services
:   Discover [Cortex Search](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-search/cortex-search-overview) services available in a schema. Cortex Search provides semantic + lexical search over indexed text columns.
    - `database` (required): Case-sensitive database name.
    - `schema` (required): Case-sensitive schema name.
    - `like`, `showLimit`, `fromName` (optional): Same semantics as *List databases*.

Cortex Search
:   Run a natural-language query against a Cortex Search service. Hybrid semantic + lexical matching over the service's indexed search column.
    - `database` (required): Case-sensitive database name.
    - `schema` (required): Case-sensitive schema name.
    - `serviceName` (required): Case-sensitive name of the Cortex Search service.
    - `query` (required): Natural-language search string.
    - `columns` (optional): Additional columns to return for each result. Must be included in the service's source query.
    - `filter` (optional): Filter object restricting results by `ATTRIBUTES` columns. Operators: `@eq`, `@contains`, `@gte`, `@lte`, `@and`, `@or`, `@not`. Example: `{"@and": [{"@eq": {"REGION": "US"}}, {"@gte": {"YEAR": 2024}}]}`.
    - `limit` (optional): Maximum number of results to return (1–1000, default 10). Prefer `<=20` to keep results small.

::::{tip}
Use *Run query* (or *Execute statement*, from a workflow) to submit SQL, then poll with *Get statement status* using the returned `statementHandle`. If the response status is 202, the statement is still running — wait and poll again. A 200 response contains the result data and column metadata. Use *Cancel statement* to stop long-running statements.

For AI agents without prior knowledge of the target data, discover before querying: *List databases* → *List schemas* → *List tables* → *Describe table* → *Run query*. Discovery actions return clean JSON and do not require a warehouse, so they are faster and cheaper than equivalent `SHOW` / `DESCRIBE` calls through *Run query*.
::::

## Security model [snowflake-action-security-model]

The connector splits SQL execution across two actions with different exposure:

- *Run query* is available to AI agents and is restricted to read-only statements (`SELECT`, `WITH`, `SHOW`, `DESCRIBE`, `EXPLAIN`). The restriction is enforced in the connector before the request is sent, so write, DDL, privilege, procedure, and session-state statements never reach Snowflake.
- *Execute statement* is available only to workflow authors and direct API callers. AI agents cannot invoke it. Use it when you deliberately want a workflow to write, modify schema, or run multi-statement SQL.

For defense in depth, grant the connector credentials only the Snowflake privileges the intended use case requires. A read-only role paired with *Run query* keeps agents safely within SELECT access even if the underlying role is later expanded.

## Connector networking configuration [snowflake-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [snowflake-api-credentials]

The Snowflake connector supports two authentication methods: **OAuth Authorization Code** (recommended) and **Programmatic Access Token** (PAT).

### OAuth Authorization Code (recommended)

Use this method to let users authorize the connector with their own Snowflake account. The connector handles token exchange and refresh automatically using Proof Key for Code Exchange (PKCE).

1. In your Snowflake account, create a security integration for a custom OAuth client:

   ```sql
   CREATE SECURITY INTEGRATION kibana_oauth
     TYPE = OAUTH
     ENABLED = TRUE
     OAUTH_CLIENT = CUSTOM
     OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
     OAUTH_REDIRECT_URI = 'https://<your-kibana-host>/api/actions/connector/_oauth_callback'
     OAUTH_ISSUE_REFRESH_TOKENS = TRUE
     OAUTH_REFRESH_TOKEN_VALIDITY = 7776000;
   ```

2. Retrieve the client ID and client secret:

   ```sql
   SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('KIBANA_OAUTH');
   ```

3. In {{kib}}, create a Snowflake connector and select **OAuth Authorization Code** as the authentication method. Enter:
   - **Authorization URL**: `https://<account>.snowflakecomputing.com/oauth/authorize`
   - **Token URL**: `https://<account>.snowflakecomputing.com/oauth/token-request`
   - **Client ID** and **Client Secret** from step 2.
4. Authorize with your Snowflake account.

### Programmatic Access Token (PAT)

Use this method for quick setup or automated access. Snowflake PATs are tied to a specific user and role.

1. In your Snowflake account, ensure programmatic access tokens are enabled for your user.
2. Generate a PAT through the Snowflake web UI (**User Menu → Preferences → Programmatic Access Tokens**) or through SQL.
3. In {{kib}}, create a Snowflake connector and select **Bearer** as the authentication method. Paste the PAT into the **Snowflake access token** field.

::::{note}
PATs might expire depending on your Snowflake account configuration. Regenerate the token before it expires.
::::
