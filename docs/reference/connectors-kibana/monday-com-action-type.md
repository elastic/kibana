---
navigation_title: "Monday.com"
type: reference
description: "Monday.com connector reference for searching boards, reading and creating items, posting updates, and managing workspaces through the official remote Monday.com MCP server."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Monday.com connector [monday-com-action-type]

The Monday.com connector connects to Monday.com through the official remote Model Context Protocol (MCP) server at `https://mcp.monday.com/mcp`. Agents and workflows use the connector to search boards, read and create items, post updates, and discover workspaces. The connector supports two authentication methods: Monday.com OAuth 2.0 (recommended) and Personal API Token.

## Create connectors in {{kib}} [define-monday-com-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [monday-com-connector-configuration]

Monday.com connectors have the following configuration properties:

**Authentication** (recommended: OAuth 2.0)
:   Choose one of two authentication methods:

    - **OAuth 2.0** (recommended): Authenticates through Monday.com OAuth 2.0 Authorization Code flow. Requires a Client ID and Client Secret from a registered Monday.com app. For setup instructions, see [Get credentials](#monday-com-oauth-credentials).
    - **Personal API Token**: Authenticates using a Monday.com personal API token sent as a Bearer token. Simpler to set up but scoped to a single user account. For setup instructions, see [Get credentials](#monday-com-personal-api-token).

## Test connectors [monday-com-test-connector]

You can test connectors when you create or edit the connector in {{kib}}.

## Connector actions [monday-com-connector-actions]

The Monday.com connector exposes the following actions:

### Discovery

`whoAmI`
:   Retrieve the current authenticated Monday.com user, their account information, and a list of boards and workspaces they have access to. Use this as the first call to orient an agent — it returns user ID, account name, board IDs, and workspace IDs needed for subsequent actions.

`search`
:   Search for boards, documents, forms, and folders in Monday.com by keyword. Returns matching items with names and IDs. Use this to locate a board or document before reading its details.

### Boards and items

`getBoardInfo`
:   Get detailed metadata for a Monday.com board, including its columns (with IDs and types), groups, views, and owners. Use this after `search` or `whoAmI` to inspect board structure before reading items or updating column values.

`getBoardItemsPage`
:   Paginate through all items on a Monday.com board. Returns item names, column values, group membership, and a cursor for the next page. Pass the cursor from the previous response to fetch subsequent pages.

`getItem`
:   Retrieve a single Monday.com item by ID. Returns the item name, all column values, group membership, and parent board ID. Use this when you already know the item ID and need its full details without paginating a board.

`getItemsByColumnValue`
:   Find items on a Monday.com board where a specific column matches a given value. Use `getBoardInfo` to discover column IDs and the expected value format for each column type. Returns matching items with their names, column values, and group membership.

`createItem`
:   Create a new item (row) on a Monday.com board (available in Workflows only). Optionally assign it to a specific group and set initial column values. Use `getBoardInfo` to discover group IDs and column IDs before calling this action.

`changeItemColumnValues`
:   Update one or more column values on an existing Monday.com item (available in Workflows only). Provide a map of column IDs to new values. Use `getBoardInfo` to discover column IDs and their expected value formats.

`createSubitem`
:   Create a subitem under an existing Monday.com item (available in Workflows only). Subitems share the column structure of the parent board's subitems board. Returns the created subitem with its ID.

`moveItemToGroup`
:   Move a Monday.com item to a different group within the same board (available in Workflows only). Use `getBoardInfo` to discover available group IDs.

`archiveItem`
:   Archive a Monday.com item (available in Workflows only). Archived items are hidden from the board view but remain accessible via filters and are not permanently deleted.

`deleteItem`
:   Permanently delete a Monday.com item and all its subitems and updates (available in Workflows only). This action cannot be undone.

### Updates and comments

`createUpdate`
:   Post an update (comment) on a Monday.com item. Use this to add progress notes, status commentary, or any text message to an item thread. Returns the created update including its ID and timestamp.

`getUpdates`
:   Retrieve updates (comments) posted on a Monday.com item. Returns update text, author, and timestamps in reverse-chronological order.

`editUpdate`
:   Edit the body of an existing update (comment) on a Monday.com item. Use `getUpdates` to retrieve the update ID before calling this action. Replaces the full body text.

### Notifications

`createNotification`
:   Send an in-app notification to a Monday.com user. Set `targetType` to `Project` to link to an item, or `Post` to link to an update (comment). Use `whoAmI` to look up user IDs.

### Utilities

`listTools`
:   List all tools available on the Monday.com MCP server. The server exposes over 60 tools covering boards, items, workspaces, docs, dashboards, automations, AI agents, and more. Use this to discover capabilities not exposed as named actions.

`callTool`
:   Call any tool on the Monday.com MCP server directly by name. Use this as a fallback for operations not yet exposed as named actions, such as creating workspaces, managing automations, creating dashboards, or running GraphQL queries. Use `listTools` first to discover available tool names and their required arguments.

## Connector networking configuration [monday-com-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get credentials (OAuth) [monday-com-oauth-credentials]

To use the Monday.com connector, you must register an app in the Monday.com Developer Center to obtain a Client ID and Client Secret.

1. Go to the [Monday.com Developer Center](https://developer.monday.com/) and sign in with your Monday.com account.
2. Select **Build app** or navigate to your existing app.
3. In the app settings, open the **OAuth** section.
4. Under **Redirect URIs**, add `https://<your-kibana-host>/api/actions/connector/_oauth_callback`.
5. Under **Scopes**, enable the following permissions:
   - `me:read`
   - `boards:read`
   - `boards:write`
   - `items:read`
   - `items:write`
   - `updates:read`
   - `updates:write`
6. Note the following values for use in {{kib}}:

   | Monday.com App setting | {{kib}} field |
   |------------------------|---------------|
   | **Client ID**          | Client ID     |
   | **Client Secret**      | Client Secret |

7. In {{kib}}, enter the values from the preceding table.
8. Complete the authorization flow to connect your Monday.com account.

## Get credentials (personal API token) [monday-com-personal-api-token]

To use Personal API Token authentication:

1. In Monday.com, click your avatar in the top-right corner and select **Developers**.
2. In the left sidebar, select **My access tokens**.
3. Click **Show** next to your personal token and copy it.
4. In {{kib}}, select **Personal API Token** as the authentication method and paste the token into the **Token** field.
