---
navigation_title: "Notion"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/notion-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# Notion connector [notion-action-type]

The Notion connector communicates with the Notion API to explore content and databases in your Notion workspace.

## Create connectors in {{kib}} [define-notion-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [notion-connector-configuration]

Notion connectors have the following configuration properties:

API Token
:   The Notion API token (bearer token) for authentication. You can obtain this by creating an [internal integration](https://www.notion.com/help/create-integrations-with-the-notion-api#create-an-internal-integration).

## Test connectors [notion-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Notion connector has the following actions:

Search Page or Data Source by Title
:   Search for pages or databases by title.
    - **Query** (required): The search query string.
    - **Query Object Type** (required): Type of object to search for (`page` or `data_source`).
    - **Start Cursor** (optional): Cursor for pagination.
    - **Page Size** (optional): Number of results per page.

Get Page
:   Retrieve a page by its ID.
    - **Page ID** (required): The unique identifier of the page.

Get Data Source
:   Retrieve a database by its ID. Retrieve a database by its ID. This only returns information about the database properties and columns, _not_ about its rows.
    - **Data Source ID** (required): The unique identifier of the database. Check [Notion's documentation](https://developers.notion.com/reference/retrieve-a-data-source#finding-a-data-source-id) for instructions on how to find this ID.

Query Data Source
:   Query a database with optional filters.
    - **Data Source ID** (required): The unique identifier of the database to query.
    - **Filter** (optional): JSON string representing the filter object.
    - **Start Cursor** (optional): Cursor for pagination.
    - **Page Size** (optional): Number of results per page.

## Connector networking configuration [notion-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [notion-api-credentials]

To use the Notion connector, you need to create an internal integration:

1. Go to [Notion](https://www.notion.so/).
2. Navigate to [My integrations](https://www.notion.so/my-integrations).
3. Click **+ New integration**.
4. Configure your integration:
   - Set a name for your integration.
   - Select the workspace where you want to use the integration.
   - Configure the capabilities (content, comment, and user capabilities as needed).
5. Click **Submit** to create the integration.
6. Copy the **Internal Integration Token** (this is your bearer token).
7. Share the pages and databases you want to access with your integration by clicking **Share** on the page or database and inviting your integration.
