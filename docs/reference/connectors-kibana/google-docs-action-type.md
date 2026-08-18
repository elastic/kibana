---
navigation_title: "Google Docs"
type: reference
description: "Use the Google Docs connector to read and update documents in Google Docs."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Google Docs connector [google-docs-action-type]

The Google Docs connector enables reading and updating documents in Google Docs.

This connector is backed by the official [Google Docs MCP server](https://docsmcp.googleapis.com/mcp/v1) (currently in Developer Preview).

## Create connectors in {{kib}} [define-google-docs-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-docs-connector-configuration]

Google Docs connectors use **OAuth 2.0 authorization code** — Google signs the user in through {{kib}} and {{kib}} stores refreshable tokens.

OAuth 2.0 authorization code
:   Uses a **Web application** OAuth client in Google Cloud. In {{kib}} you provide:

    - **Client ID** and **Client Secret**: from that OAuth client
    - **Redirect URI**: register {{kib}}'s OAuth callback in Google Cloud (see **Get API credentials**)

    The connector automatically uses the correct Google OAuth endpoints and the `https://www.googleapis.com/auth/documents` scope.

## Test connectors [google-docs-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by listing available tools from the Google Docs MCP server.

The Google Docs connector has the following actions:

Read document
:   Read the full content and structure of a Google Doc.
    Returns a JSON representation of the document including body paragraphs, tables, lists, inline images, and document metadata.
    - `document_id` (required): The ID of the Google Doc. Found in the document URL: `docs.google.com/document/d/{document_id}/edit`.

Update document
:   Apply one or more batch updates to a Google Doc. Supports inserting or replacing text, formatting runs, managing bullet lists, inserting tables and rows, inserting images, adding comments, accepting or rejecting suggestions, and more.
    - `document_id` (required): The ID of the Google Doc to update.
    - `requests` (required): Array of batch update request objects (1 to 100). Each object must contain exactly one operation key. Multiple requests are applied atomically in order. See the [Google Docs batchUpdate reference](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate) for the full list of supported operations.

List tools
:   List all MCP tools exposed by the Google Docs MCP server. Useful for discovering available capabilities.

Call tool
:   Call any MCP tool on the Google Docs MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.
    - `name` (required): The MCP tool name. Use the **List tools** action to discover available tool names.
    - `arguments` (optional): Tool arguments as a key/value map.

## Connector networking configuration [google-docs-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-docs-api-credentials]

### OAuth 2.0 authorization code (recommended for ongoing use)

This matches the **OAuth 2.0 authorization code** authentication type in {{kib}}. Configure a **Web application** OAuth
client in Google Cloud.

Start in **[Google Cloud Console](https://console.cloud.google.com/)**.

1. In Google Cloud Console, select or create a project. Enable the **Google Docs API** for that project (**APIs &
   Services** > **Library**).
2. Open **APIs & Services** > **OAuth consent screen**.
   - Create OAuth Client
   - Select **Web Application**
   - The **Name** can be something like `Elastic` or `Kibana`
   - Under **Authorized JavaScript origins**, add the base origin of your {{kib}} deployment (scheme, host, and port only —
     for example `https://my-kibana.example.com`).
   - Under **Authorized redirect URIs**, add {{kib}}'s connector OAuth callback for your host. Copy the pattern below and
     substitute your public {{kib}} hostname:
     ```text
     https://<your-kibana-host>/api/actions/connector/_oauth_callback
     ```
3. Open **APIs & Services** > **Data Access** and add the `https://www.googleapis.com/auth/documents` scope.
4. Create the client, then copy **Client ID** and **Client secret** into the connector in {{kib}} when you select **OAuth
   2.0 authorization code**. The connector automatically configures the correct Google OAuth endpoints and scope.

