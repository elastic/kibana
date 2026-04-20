---
navigation_title: "Outlook"
type: reference
description: "Use the Outlook connector to search emails, list folders, and read messages and attachments from Microsoft Outlook."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Outlook connector [outlook-action-type]

The Outlook connector connects to the Microsoft Graph API and enables federated search and browsing of email in Microsoft Outlook. You can configure either a delegated Bearer token (for access on behalf of a user) or OAuth client credentials (for app-only access to a mailbox).

## Create connectors in {{kib}} [define-outlook-ui]

You can create an Outlook connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding an Outlook data source.

### Connector configuration [outlook-connector-configuration]

#### Bearer token (delegated auth)

Microsoft API token
:   A Microsoft Bearer token obtained through the delegated OAuth flow (for example, a user access token from the Authorization Code flow). Provides access to the authenticated user's mailbox.

#### OAuth client credentials (app-only auth)

Client ID
:   The Application (client) ID of your Azure Active Directory (Azure AD) application registration.

Client secret
:   The client secret generated for your Azure AD application.

Token URL
:   The token endpoint for your Azure AD tenant: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`. Replace `{tenant-id}` with your Azure AD tenant ID.

## Test connectors [outlook-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's profile (delegated auth) or checking Microsoft Graph API accessibility (app-only auth).

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
- `userId` (optional): Required for app-only auth. The user's ID or UPN (for example, `user@contoso.com`).
- `from` (optional): Zero-based pagination offset (default: 0).
- `size` (optional): Number of results to return (1–25, default 10).

### List messages

Lists email messages from a mailbox folder. Supports OData filters for finer control.

Parameters:

- `folderId` (optional): Folder name or ID. Well-known names: `inbox`, `sentitems`, `drafts`, `deleteditems`, `junkemail`. Omit to list from the full mailbox.
- `userId` (optional): Required for app-only auth.
- `top` (optional): Maximum number of messages (1–100, default 20).
- `filter` (optional): OData `$filter` expression, for example `isRead eq false` or `receivedDateTime ge 2024-01-01T00:00:00Z`.
- `orderby` (optional): OData sort expression, for example `receivedDateTime desc` (default).

### Get message

Retrieves a single Outlook message by ID, including the full HTML or text body.

Parameters:

- `messageId` (required): The message ID from list messages or search messages.
- `userId` (optional): Required for app-only auth.

### List attachments

Lists attachments on a message with metadata (name, content type, size).

Parameters:

- `messageId` (required): The message ID.
- `userId` (optional): Required for app-only auth.

### Get attachment

Downloads an attachment as a base64-encoded string (`contentBytes`). Call list attachments first to discover attachment IDs.

Parameters:

- `messageId` (required): The message ID.
- `attachmentId` (required): The attachment ID from list attachments.
- `userId` (optional): Required for app-only auth.

::::{note}
Attachment content can be large. Only call this action when you have a plan to process the binary data, for example, via an Elasticsearch ingest pipeline attachment processor.
::::

### List folders

Lists mail folders in a mailbox, including their item counts.

Parameters:

- `userId` (optional): Required for app-only auth.
- `includeHidden` (optional): Whether to include hidden system folders (default: `false`).

## Connector networking configuration [outlook-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), add `graph.microsoft.com` and `login.microsoftonline.com` to the list.

## Get API credentials [outlook-api-credentials]

To use the Outlook connector, you need a Microsoft Azure AD application with the required Graph API permissions.

### Bearer token (delegated auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **API permissions**, add the following **Delegated** permissions for Microsoft Graph:
   - `Mail.Read` — Read user mail
   - `Mail.ReadBasic` — Read basic mail metadata
4. Obtain a user access token through the OAuth delegated flow (for example, Authorization Code flow).
5. In the **Microsoft API token** field, enter your user access token.

### OAuth client credentials (app-only auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **API permissions**, add the following **Application** permissions for Microsoft Graph:
   - `Mail.Read` — Read all users' mail
   - `Mail.ReadBasic.All` — Read all users' basic mail metadata
4. Grant admin consent for the permissions.
5. Under **Certificates & secrets**, create a new client secret.
6. Copy the **Application (client) ID**, **client secret value**, and **tenant ID**. In the connector configuration, enter the client ID and client secret, and set the Token URL to `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`.

::::{note}
App-only auth requires passing a `userId` (user ID or UPN, for example `user@contoso.com`) to each action, because there is no signed-in user context.
::::
