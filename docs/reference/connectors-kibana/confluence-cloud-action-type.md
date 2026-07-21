---
navigation_title: "Confluence Cloud"
type: reference
description: "Use the Confluence Cloud connector to search and retrieve pages and spaces from your Confluence Cloud site."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Confluence Cloud connector [confluence-cloud-action-type]

The Confluence Cloud connector connects to the official [Atlassian remote MCP server](https://developer.atlassian.com/cloud/confluence/mcp/) to list and retrieve spaces and pages. It uses OAuth 2.0 Authorization Code flow (Atlassian OAuth) for authentication.

## Create connectors in {{kib}} [define-confluence-cloud-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [confluence-cloud-connector-configuration]

Confluence Cloud connectors have the following configuration properties:

Authentication type
:   OAuth 2.0 Authorization Code flow. Refer to [Set up OAuth authentication](#confluence-cloud-oauth-setup) for setup instructions.

Client ID
:   The client ID from your Atlassian OAuth 2.0 app.

Client secret
:   The client secret from your Atlassian OAuth 2.0 app.

## Test connectors [confluence-cloud-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

## Actions [confluence-cloud-actions]

The Confluence Cloud connector provides the following actions:

List pages
:   List Confluence pages with optional filters and cursor-based pagination.
    - `limit` (optional): Maximum number of pages to return.
    - `cursor` (optional): Pagination cursor from a previous response.
    - `spaceId` (optional): Space ID to filter pages by.
    - `title` (optional): Filter pages by title (partial match).
    - `status` (optional): Page status filter (for example, `current`, `archived`, `draft`).

Get page
:   Retrieve full details of a single Confluence page by its ID.
    - `id` (required): The numeric ID of the page to retrieve.

List spaces
:   List Confluence spaces with optional filters.
    - `limit` (optional): Maximum number of spaces to return.
    - `type` (optional): Space type filter (for example, `global`, `personal`).

Get space
:   Retrieve full details of a single Confluence space by its ID.
    - `id` (required): The numeric ID of the space to retrieve.

## Connector networking configuration [confluence-cloud-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Set up OAuth authentication [confluence-cloud-oauth-setup]

To use the Confluence Cloud connector, you must create an OAuth 2.0 app in the Atlassian Developer Console and configure it for the Atlassian MCP server.

### Create an OAuth 2.0 app in Atlassian

1. Go to the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and sign in with your Atlassian account.
2. Select **Create** and choose **OAuth 2.0 integration**.
3. Enter a name for the app (for example, `Kibana Confluence Cloud connector`) and agree to the developer terms, then select **Create**.
4. In the app settings, go to **Authorization** and select **Add** next to **OAuth 2.0 (3LO)**.
5. When prompted for **Access type**, select **Resource-level**. This restricts the OAuth token to the specific Confluence site the user selects during authorization.
6. Set the **Callback URL** to your {{kib}} OAuth callback URL. The format is: `https://<your-kibana-url>/api/actions/connector/_oauth_callback`
7. Select **Save changes**.

### Configure permissions

1. In the app settings, go to **Permissions**.
2. Find **Confluence API** and select **Add**.
3. Select **Configure** and enable the following scopes under **Classic scopes**:
   - `read:confluence-content.all` — Read access to Confluence pages and content.
   - `read:confluence-space.summary` — Read access to Confluence space summaries.
   - `read:confluence-content.permission` — Read access to content permissions.
   - `search:confluence` — Search access to Confluence content.

### Retrieve your app credentials

1. In the app settings, go to **Settings**.
2. Copy the **Client ID** and **Secret** values. Enter these when configuring the connector in {{kib}}.

For more information on Atlassian OAuth 2.0 apps, refer to [Atlassian's OAuth 2.0 (3LO) documentation](https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/).
