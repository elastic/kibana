---
navigation_title: "Google Docs"
type: reference
description: "Use the Google Docs connector to read and update documents in Google Docs."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google Docs connector [google-docs-action-type]

The Google Docs connector enables reading documents as Markdown and applying batch updates. This connector is complementary to the [Google Drive connector](/reference/connectors-kibana/google-drive-action-type.md): use Drive to search or list files, then pass the document ID to the actions on this page.

## Create connectors in {{kib}} [define-google-docs-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-docs-connector-configuration]

Google Docs connectors use **OAuth 2.0 authorization code** — Google signs the user in through {{kib}} and {{kib}} stores refreshable tokens.

OAuth 2.0 authorization code
:   Uses a **Web application** OAuth client in Google Cloud. In {{kib}} you provide:

    - **Client ID** and **Client Secret**: from that OAuth client
    - **Redirect URI**: register {{kib}}'s OAuth callback in Google Cloud (see **Get API credentials**)

    The connector automatically uses the correct Google OAuth endpoints and the required scopes (`https://www.googleapis.com/auth/drive.readonly` and `https://www.googleapis.com/auth/documents`).

## Test connectors [google-docs-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by fetching user information from the Google Drive API.

The Google Docs connector has the following actions:

Read document
:   Read the full content of a Google Doc as Markdown.
    Returns the document title, Markdown content, total character count, and a web link.
    - `document_id` (required): The ID of the Google Doc. Found in the document URL: `docs.google.com/document/d/{document_id}/edit`.
    - `max_characters` (optional): Maximum number of characters to return (default 100,000, range 1,000–200,000). If the document is longer, the response includes `truncated: true` and `next_offset`.
    - `offset` (optional): Character offset to start reading from (default 0). Pass `next_offset` from a previous response to page through a long document.

Update document
:   Apply one or more batch updates to a Google Doc. Supports replacing text, applying text and paragraph styles, managing bullet lists, inserting and deleting tables and table rows, inserting inline images, and managing named ranges.
    - `document_id` (required): The ID of the Google Doc to update.
    - `requests` (required): Array of batch update request objects (1 to 100). Each object must contain exactly one operation key. Multiple requests are applied atomically in order. See the [Google Docs batchUpdate reference](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate) for the full list of supported operations.

    Use `replaceAllText` for text replacement — it requires no index arithmetic and is the safest approach.

## Connector networking configuration [google-docs-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-docs-api-credentials]

Configure a **Web application** OAuth client in Google Cloud.

Start in **[Google Cloud Console](https://console.cloud.google.com/)**.

1. In Google Cloud Console, select or create a project. Enable the **Google Docs API** and **Google Drive API** for that project (**APIs & Services** > **Library**).
2. Open **APIs & Services** > **OAuth consent screen**.
   - Create OAuth Client
   - Select **Web Application**
   - The **Name** can be something like `Elastic` or `Kibana`
   - Under **Authorized JavaScript origins**, add the base origin of your {{kib}} deployment (scheme, host, and port only —
     for example, `https://my-kibana.example.com`).
   - Under **Authorized redirect URIs**, add {{kib}}'s connector OAuth callback. The easiest way
     is to copy the exact URI shown in the {{kib}} connector creation form. If you need to
     construct it manually, use the pattern below, substituting your public {{kib}} hostname and
     any configured `server.basePath` (for example, if Kibana is served at `https://my-kibana.example.com/kibana`,
     use `/kibana/api/...` instead of `/api/...`):
     ```text
     https://<your-kibana-host>/api/actions/connector/_oauth_callback
     ```
3. Open **APIs & Services** > **Data Access** and add the following scopes:
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive.readonly`
4. Create the client, then copy **Client ID** and **Client secret** into the connector in {{kib}} when you select **OAuth
   2.0 authorization code**. The connector automatically configures the correct Google OAuth endpoints and scopes.
