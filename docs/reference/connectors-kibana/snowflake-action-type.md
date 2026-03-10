---
navigation_title: "Snowflake"
type: reference
description: "Use the Snowflake connector to execute SQL queries, explore databases, schemas, tables, and warehouses in your Snowflake data warehouse."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Snowflake connector [snowflake-action-type]

The Snowflake connector communicates with the Snowflake SQL REST API to execute SQL statements and explore your data warehouse. It supports arbitrary SQL execution, async statement management, and metadata discovery for databases, schemas, tables, and warehouses.

## Create connectors in {{kib}} [define-snowflake-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [snowflake-connector-configuration]

Snowflake connectors use Bearer token authentication and have the following configuration properties:

Account URL
:   The URL of your Snowflake account. The value follows the pattern `https://<account_identifier>.snowflakecomputing.com`.

Authentication token
:   A Bearer token used to authenticate API requests. This can be a JWT generated from key pair authentication, an OAuth token, or a Programmatic Access Token (PAT). Snowflake auto-detects the token type.

Warehouse (optional)
:   The default virtual warehouse to use for queries. Can be overridden per query. Example: `COMPUTE_WH`.

Database (optional)
:   The default database to use for queries. Can be overridden per query. Example: `MY_DATABASE`.

Schema (optional)
:   The default schema to use for queries. Can be overridden per query. Example: `PUBLIC`.

Role (optional)
:   The default role to use for queries. Can be overridden per query. Example: `SYSADMIN`.

## Test connectors [snowflake-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by running `SELECT CURRENT_VERSION()`.

The Snowflake connector has the following actions:

Execute SQL
:   Execute an arbitrary SQL statement against Snowflake. For fast queries, results are returned inline. For long-running queries, Snowflake returns a statement handle that you can check with *Get statement status*.
    - `statement` (required): The SQL statement to execute (for example, `SELECT * FROM my_table LIMIT 10`).
    - `timeout` (optional): Query timeout in seconds. Defaults to 60.
    - `database` (optional): Override the default database for this query.
    - `schema` (optional): Override the default schema for this query.
    - `warehouse` (optional): Override the default warehouse for this query.
    - `role` (optional): Override the default role for this query.

Get statement status
:   Check the execution status of a previously submitted SQL statement, or fetch additional result partitions for large result sets.
    - `statementHandle` (required): The statement handle returned from a previous *Execute SQL* call.
    - `partition` (optional): Partition index for fetching large result sets.

Cancel statement
:   Cancel a running SQL statement.
    - `statementHandle` (required): The statement handle of the running query to cancel.

List databases
:   List all databases accessible in the Snowflake account. Takes no inputs.

List schemas
:   List schemas in a database.
    - `database` (optional): Database name. Uses the configured default if omitted.

List tables
:   List tables in a database and schema.
    - `database` (optional): Database name. Uses the configured default if omitted.
    - `schema` (optional): Schema name. Uses the configured default if omitted.

Describe table
:   Get column names, data types, and other metadata for a table.
    - `tableName` (required): Fully-qualified or unqualified table name (for example, `MY_DB.PUBLIC.MY_TABLE` or `MY_TABLE`).

List warehouses
:   List all virtual warehouses accessible in the Snowflake account. Takes no inputs.

::::{tip}
Use *List databases*, *List schemas*, and *List tables* to explore the data warehouse structure. Then use *Describe table* to understand column types before writing SQL queries with *Execute SQL*. For long-running queries, *Execute SQL* returns a statement handle that you can poll with *Get statement status* or cancel with *Cancel statement*.
::::

## Connector networking configuration [snowflake-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [snowflake-api-credentials]

To use the Snowflake connector, you need a Snowflake account and an authentication token. Snowflake supports three token types:

### Key pair authentication (JWT)

1. Generate an RSA key pair:

   ```bash
   openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
   openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
   ```

2. Assign the public key to your Snowflake user:

   ```sql
   ALTER USER my_user SET RSA_PUBLIC_KEY='MII...';
   ```

3. Generate a JWT using the private key. The JWT must include:
   - `iss`: `<ACCOUNT>.<USER>.SHA256:<public_key_fingerprint>`
   - `sub`: `<ACCOUNT>.<USER>`
   - `iat`: Current timestamp
   - `exp`: Expiration (maximum 1 hour)

4. Enter the generated JWT as the **Authentication token** when configuring the connector in {{kib}}.

### OAuth token

1. Set up an OAuth integration in Snowflake (refer to the [Snowflake OAuth documentation](https://docs.snowflake.com/en/user-guide/oauth-intro)).
2. Obtain an OAuth access token through your identity provider.
3. Enter the OAuth token as the **Authentication token** when configuring the connector in {{kib}}.

### Programmatic Access Token (PAT)

1. Generate a PAT in the Snowflake UI under your user profile settings, or using SQL:

   ```sql
   ALTER USER my_user ADD PROGRAMMATIC ACCESS TOKEN my_token;
   ```

2. Enter the PAT as the **Authentication token** when configuring the connector in {{kib}}.

::::{note}
JWT tokens expire after at most 1 hour. OAuth tokens have configurable expiration. You need to regenerate expired tokens. For production use, consider OAuth with automatic token refresh.
::::
