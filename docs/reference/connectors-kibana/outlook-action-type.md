---
navigation_title: "Outlook"
type: reference
description: "Use the Outlook connector to search emails, list folders, and read messages and attachments from Microsoft Outlook."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Outlook connector [outlook-action-type]

The Outlook connector connects to the Microsoft Graph API and enables federated search and browsing of email in Microsoft Outlook. It uses OAuth Authorization Code flow to access the authenticated user's mailbox on their behalf.

## Create connectors in {{kib}} [define-outlook-ui]

You can create an Outlook connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding an Outlook data source.

### Connector configuration [outlook-connector-configuration]

Client ID
:   The Application (client) ID of your Microsoft Entra ID application registration.

Client secret
:   The client secret generated for your Microsoft Entra ID application.

Authorization URL
:   The authorization endpoint for your Microsoft Entra tenant: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`. Replace `{tenant-id}` with your tenant ID.

Token URL
:   The token endpoint for your Microsoft Entra tenant: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`. Replace `{tenant-id}` with your tenant ID.

## Test connectors [outlook-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's profile from Microsoft Graph.

## Available actions [outlook-available-actions]

| Action | Description |
|--------|-------------|
| Search messages | Search emails using KQL syntax across subject, sender, body, and date. |
| List messages | List email messages from the inbox or a specific folder, with optional OData filters. |
| Get message | Retrieve the full content (including body) of a single email by ID. |
| List attachments | List the attachments on a message, including name, type, and size. |
| Get attachment | Download an attachment as a base64-encoded string. |
| List folders | List mail folders in a mailbox, including well-known folders (inbox, sentitems, drafts). |

### Search messages

Searches Outlook mail using the Microsoft Graph Search API with Keyword Query Language (KQL) syntax.

Parameters:

- `query` (required): KQL query string. Examples: `subject:budget Q4`, `from:alice@contoso.com`, `hasAttachments:true AND subject:report`.
- `from` (optional): Zero-based pagination offset (default: 0).
- `size` (optional): Number of results to return (1–25, default 10).

### List messages

Lists email messages from a mailbox folder. Supports OData filters for finer control.

Parameters:

- `folderId` (optional): Folder name or ID. Well-known names: `inbox`, `sentitems`, `drafts`, `deleteditems`, `junkemail`. If not specified, fetches the full mailbox.
- `top` (optional): Maximum number of messages (1–100, default 20).
- `filter` (optional): OData `$filter` expression, for example `isRead eq false` or `receivedDateTime ge 2024-01-01T00:00:00Z`.
- `orderby` (optional): OData sort expression, for example `receivedDateTime desc` (default).

### Get message

Retrieves a single Outlook message by ID, including the full HTML or text body.

Parameters:

- `messageId` (required): The message ID from list messages or search messages.

### List attachments

Lists attachments on a message with metadata (name, content type, size).

Parameters:

- `messageId` (required): The message ID.

### Get attachment

Downloads an attachment as a base64-encoded string (`contentBytes`). Call list attachments first to discover attachment IDs.

Parameters:

- `messageId` (required): The message ID.
- `attachmentId` (required): The attachment ID from list attachments.

::::{note}
Attachment content can be large. Only call this action when you have a plan to process the binary data, for example, using an Elasticsearch ingest pipeline attachment processor.
::::

### List folders

Lists mail folders in a mailbox, including their item counts.

Parameters:

- `includeHidden` (optional): Whether to include hidden system folders (default: `false`).

## Connector networking configuration [outlook-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), add `graph.microsoft.com` and `login.microsoftonline.com` to the list.

## Get API credentials [outlook-api-credentials]

To use the Outlook connector, you need a Microsoft Entra ID application registration with the required Graph API permissions.

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Microsoft Entra ID → App registrations**.
2. Create a new application registration. Under **Redirect URIs**, add your Kibana callback URL.
3. Under **API permissions**, add the following **Delegated** permissions for Microsoft Graph:
   - `Mail.Read` — Read user mail
   - `Mail.ReadBasic` — Read basic mail metadata
   - `offline_access` — Allow the app to maintain access between sessions
4. Under **Certificates & secrets**, create a new client secret and note the value.
5. Copy the **Application (client) ID**, **client secret value**, and **tenant ID**.
6. In the connector configuration, enter the client ID and client secret, and set the authorization and token URLs using your tenant ID.
