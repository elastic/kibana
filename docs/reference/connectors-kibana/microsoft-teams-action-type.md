---
navigation_title: "Microsoft Teams"
type: reference
description: "Use the Microsoft Teams connector to search messages and browse teams, channels, and chats using the Microsoft Graph API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Microsoft Teams connector [microsoft-teams-connector]

The Microsoft Teams connector enables Workplace AI to search messages and browse teams, channels, and chats in Microsoft Teams using the Microsoft Graph API.

## Create connectors in {{kib}} [define-microsoft-teams-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [microsoft-teams-connector-configuration]

Microsoft Teams connectors have the following configuration properties:

#### Bearer token (delegated auth)

Microsoft API token
:   A Microsoft bearer token obtained through the delegated OAuth flow (for example, a user access token). Provides access to the authenticated user's teams, channels, chats, and messages.

#### OAuth client credentials (app-only auth)

Client ID
:   The Application (client) ID of your Azure Active Directory (Azure AD) application registration.

Client secret
:   The client secret generated for your Azure AD application.

Tenant ID
:   Your Azure AD tenant ID. Used to construct the token endpoint: `https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token`.

## Test connectors [microsoft-teams-action-configuration]

You can test connectors while creating or editing them in {{kib}}. The test verifies connectivity by listing the authenticated user's joined teams when using delegated auth, or all teams in the tenant when using app-only auth.

The Microsoft Teams connector has the following actions:

**List joined teams**
:   Returns the authenticated user's joined teams when using delegated auth, or the specified user's joined teams when `userId` is provided for app-only auth.
    - `userId` (optional): User ID for app-only auth through client credentials. Omit when using delegated auth (bearer token).

**List channels**
:   Returns channels for the specified team.
    - `teamId` (required): The ID of the team.

**List channel messages**
:   Returns messages in a channel.
    - `teamId` (required): The ID of the team.
    - `channelId` (required): The ID of the channel.
    - `top` (optional): Number of messages to return, up to 50.

**List chats**
:   Returns chats for the authenticated user.
    - `userId` (optional): User ID for app-only auth through client credentials.
    - `top` (optional): Number of chats to return, up to 50.

**List chat messages**
:   Returns messages in a chat.
    - `chatId` (required): The ID of the chat.
    - `top` (optional): Number of messages to return, up to 50.

**Search messages**
:   Searches for messages across Teams and chats using the Microsoft Graph Search API. It supports KQL syntax.
    - `query` (required): Search query string (for example, `from:alice sent>2024-01-01`).
    - `from` (optional): Offset for pagination.
    - `size` (optional): Number of results to return, up to 25.
    - `enableTopResults` (optional): Sort results by relevance.

## Connector networking configuration [microsoft-teams-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), add `graph.microsoft.com` and `login.microsoftonline.com` to the list.

## Get API credentials [microsoft-teams-api-credentials]

To use the Microsoft Teams connector, you need a Microsoft Azure AD application with the required Graph API permissions.

### Bearer token (delegated auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **API permissions**, add the following **Delegated** permissions for Microsoft Graph:
   - `Team.ReadBasic.All` — List joined teams and channels
   - `Chat.Read` — Read chat messages
   - `ChannelMessage.Read.All` — Read channel messages
   - `Chat.ReadBasic` — List chats
4. Obtain a user access token through the OAuth delegated flow (for example, Authorization Code flow).
5. In the **Microsoft API token** field, enter your user access token.

### OAuth client credentials (app-only auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **API permissions**, add the following **Application** permissions for Microsoft Graph:
   - `Team.ReadBasic.All` — List all teams in the tenant
   - `Channel.ReadBasic.All` — List channels
   - `ChannelMessage.Read.All` — Read channel messages
   - `Chat.Read.All` — Read all chats and messages
4. Grant admin consent for the permissions.
5. Under **Certificates & secrets**, create a new client secret. <!-- TODO: Add support for certificate auth -->
6. Copy the **Application (client) ID**, **client secret value**, and **tenant ID**. In the connector configuration, enter these values.
