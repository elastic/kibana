---
navigation_title: "Snowflake"
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Snowflake connector [snowflake-action-type]

The Snowflake connector connects to a Snowflake-managed MCP server, enabling AI agents to query structured data with Cortex Analyst, search unstructured documents with Cortex Search, and execute SQL statements against your Snowflake data warehouse.

## Create connectors in {{kib}} [define-snowflake-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [snowflake-connector-configuration]

Snowflake connectors have the following configuration properties:

MCP Server URL
:   The URL of your Snowflake-managed MCP server. The format is `https://<account>.snowflakecomputing.com/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<server_name>`. Replace the placeholders with your Snowflake account identifier, database, schema, and the name of the MCP server you created.

Bearer Token
:   A bearer token for authenticating with the Snowflake MCP server. You can generate a token through Snowflake's OAuth flow or use a programmatic access token.

## Test connectors [snowflake-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test lists available tools from the MCP server.

The Snowflake connector exposes the following tools (depending on your MCP server configuration):

Cortex Analyst
:   Translate natural language questions into SQL queries against governed semantic views.
    - **query** (required): Natural language question about your data.

Cortex Search
:   Perform semantic search over unstructured documents indexed in Snowflake.
    - **query** (required): Semantic search query.
    - **limit** (optional): Maximum number of results to return.

SQL Execution
:   Execute SQL statements directly against the Snowflake data warehouse.
    - **statement** (required): SQL statement to execute.

## Connector networking configuration [snowflake-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), make sure your Snowflake account hostname (`<account_identifier>.snowflakecomputing.com`) is included.

## Get API credentials [snowflake-api-credentials]

To use the Snowflake connector, you need a Snowflake account with an MCP server configured.

1. Ensure your Snowflake account has an MCP server created via `CREATE MCP SERVER` with the tools you want to expose (Cortex Analyst, Cortex Search, SQL execution, or custom tools).
2. Generate a bearer token for authentication. You can use Snowflake's programmatic access tokens or obtain one through the OAuth flow.
3. Note your Snowflake account identifier from your account URL (the part before `.snowflakecomputing.com`). If using a legacy account locator, include the region and cloud suffix (for example, `QQC89401.us-east-1.aws`).
4. Construct the MCP server URL: `https://<account>.snowflakecomputing.com/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<server_name>`.
5. Enter the MCP server URL and bearer token in the connector configuration.
