---
navigation_title: "Notion"
type: reference
description: "Use the Notion connector to search pages and databases, retrieve content, and query databases in your Notion workspace."
applies_to:
  stack: preview 9.3
  serverless: preview
---

# Notion connector [notion-action-type]

The Notion connector communicates with the Notion API to explore content and databases in your Notion workspace.

## Create connectors in {{kib}} [define-notion-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [notion-connector-configuration]

Notion connectors support **Bearer Token** (a static API token from an internal integration) or **OAuth 2.0 authorization code** (Notion signs the user in through {{kib}} and {{kib}} stores refreshable tokens). Select the authentication type when you create or edit the connector.

Bearer Token
:   A Notion internal integration token. See **Get API credentials**.

OAuth 2.0 authorization code
:   Uses a **public integration** in Notion. In {{kib}} you provide:

    - **Client ID** and **Client Secret**: from your Notion public integration
    - **Redirect URI**: register {{kib}}'s OAuth callback in your Notion integration settings (see **Get API credentials**)

    The connector automatically uses the correct Notion OAuth endpoints and scopes.

## Test connectors [notion-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Notion connector has the following actions:

Search Page or Data Source by Title
:   Search for pages or databases by title.
    - `Query` (required): The search query string.
    - `Query Object Type` (required): Type of object to search for (`page` or `data_source`).
    - `Start Cursor` (optional): Cursor for pagination.
    - `Page Size` (optional): Number of results per page.

Get Page
:   Retrieve a page by its ID.
    - `Page ID` (required): The unique identifier of the page.

Get Data Source
:   Retrieve a database by its ID. This action returns information about the database properties and columns, _not_ about its rows.
    - `Data Source ID` (required): The unique identifier of the database. Refer to [Notion's documentation](https://developers.notion.com/reference/retrieve-a-data-source#finding-a-data-source-id) for instructions on how to find this ID.

Query Data Source
:   Query a database with optional filters.
    - `Data Source ID` (required): The unique identifier of the database to query.
    - `Filter` (optional): JSON string representing the filter object.
    - `Start Cursor` (optional): Cursor for pagination.
    - `Page Size` (optional): Number of results per page.

## Connector networking configuration [notion-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [notion-api-credentials]

### OAuth Authorization Code (recommended)

This matches the **OAuth 2.0 authorization code** authentication type in {{kib}}. You need to create a **public integration** in Notion.

1. Go to [My integrations](https://www.notion.so/my-integrations).
2. Select **+ New integration**.
3. Configure your integration:
   - Enter a name for your integration (for example, "Elastic" or "Kibana").
   - Select the workspace where you want to use the integration.
   - Select **Public** as the integration type.
   - Fill in the required distribution fields (company name, website).
   - Add a redirect URI. Copy the following pattern and substitute your public {{kib}} hostname:
     ```text
     https://<your-kibana-host>/api/actions/connector/_oauth_callback
     ```
4. Select **Submit** to create the integration.
5. In the integration settings, open the **Configuration** tab. Copy the **Client ID** and **Client Secret**.
6. In {{kib}}, create a Notion connector and select **OAuth 2.0 authorization code** as the authentication method. Enter the **Client ID** and **Client Secret**, then select **Authorize** to sign in with your Notion account.

::::{note}
When a user authorizes the connector, Notion prompts them to select which pages and databases to share. Only the selected content is accessible to the connector.
::::

### Internal integration (Bearer Token)

Use this method if you prefer a static API token. Tokens do not expire but only grant access to content explicitly shared with the integration.

1. Go to [My integrations](https://www.notion.so/my-integrations).
2. Select **+ New integration**.
3. Configure your integration:
   - Enter a name for your integration.
   - Select the workspace where you want to use the integration.
   - Configure the capabilities (content, comment, and user capabilities as needed).
4. Select **Submit** to create the integration.
5. Copy the **Internal Integration Token** (this is your bearer token).
6. Share the pages and databases you want to access with your integration by selecting **Share** on the page or database and inviting your integration.
