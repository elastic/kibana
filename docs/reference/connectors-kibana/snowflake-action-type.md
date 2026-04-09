---
navigation_title: "Snowflake"
type: reference
description: "Use the Snowflake connector to execute SQL queries, check statement status, and cancel running statements via the Snowflake SQL REST API."
applies_to:
  stack: preview
  serverless: preview
---

# Snowflake connector [snowflake-action-type]

The Snowflake connector executes SQL statements against the [Snowflake SQL REST API](https://docs.snowflake.com/en/developer-guide/sql-api/reference). It supports asynchronous query execution, result polling, and statement cancellation.

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

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by executing `SELECT CURRENT_VERSION()` and returning the Snowflake version.

The Snowflake connector has the following actions:

Execute statement
:   Execute a SQL statement asynchronously in Snowflake. Returns a statement handle for polling results or cancellation. Supports bind variables, multi-statement execution, and per-request context overrides.
    - `statement` (required): SQL statement to execute. Supports any Snowflake SQL. Use `?` placeholders for bind variables.
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
    - `statementHandle` (required): The statement handle returned by *Execute statement*.
    - `partition` (optional): Partition number (0-based) for large result sets split across multiple partitions.

Cancel statement
:   Cancel a running SQL statement. Only works on statements that are still executing.
    - `statementHandle` (required): The statement handle of the running statement to cancel.

::::{tip}
Use *Execute statement* to submit a query, then poll with *Get statement status* using the returned `statementHandle`. If the response status is 202, the query is still running — wait and poll again. A 200 response contains the result data and column metadata. Use *Cancel statement* to stop long-running queries.
::::

## Connector networking configuration [snowflake-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [snowflake-api-credentials]

The Snowflake connector supports two authentication methods: **OAuth Authorization Code** (recommended) and **Programmatic Access Token** (PAT).

### OAuth Authorization Code (recommended)

Use this method to let users authorize the connector with their own Snowflake account. The connector handles token exchange and refresh automatically using PKCE.

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
2. Generate a PAT through the Snowflake web UI (**User Menu > Preferences > Programmatic Access Tokens**) or via SQL.
3. In {{kib}}, create a Snowflake connector and select **Bearer** as the authentication method. Paste the PAT into the **Snowflake access token** field.

::::{note}
PATs may have an expiration date depending on your Snowflake account configuration. Regenerate the token before it expires.
::::
