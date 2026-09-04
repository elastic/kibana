---
navigation_title: "Microsoft Teams"
type: reference
description: "Use the Microsoft Teams connector to send messages, search conversations, and browse teams, channels, and chats using the Microsoft Graph API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Microsoft Teams connector [microsoft-teams-connector]

The Microsoft Teams connector enables Workplace AI to send messages to channels and chats, search conversations, and browse teams, channels, and chats in Microsoft Teams using the Microsoft Graph API.

## Create connectors in {{kib}} [define-microsoft-teams-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [microsoft-teams-connector-configuration]

Microsoft Teams connectors have the following configuration properties:

#### Bearer token (delegated auth)

Microsoft API token
:   A Microsoft bearer token obtained through the delegated OAuth flow (for example, a user access token). Provides access to the authenticated user's teams, channels, chats, and messages.

#### OAuth authorization code (delegated auth)

Authorization URL
:   The Microsoft Entra ID authorization endpoint. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`. Replace `{tenant-id}` with your Azure AD tenant ID.

Token URL
:   The Microsoft Entra ID token endpoint. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`. Replace `{tenant-id}` with your Azure AD tenant ID.

#### OAuth client credentials (app-only auth)

Client ID
:   The Application (client) ID of your Azure Active Directory (Azure AD) application registration.

Client secret
:   The client secret generated for your Azure AD application.

Tenant ID
:   Your Azure AD tenant ID. Used to construct the token endpoint: `https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token`.

## Test connectors [microsoft-teams-action-configuration]

You can test connectors while creating or editing them in {{kib}}. The test verifies connectivity by listing the authenticated user's joined teams when using delegated auth, or all teams in the tenant when using app-only auth.

## Connector actions [microsoft-teams-connector-actions]

The Microsoft Teams connector has the following actions:

**List joined teams**
:   Returns the authenticated user's joined teams when using delegated auth, or the specified user's joined teams when `userId` is provided for app-only auth.
    - `userId` (optional): User ID for app-only auth through client credentials. Omit when using delegated auth (bearer token or OAuth authorization code).

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
    - `userId` (optional): User ID for app-only auth through client credentials. Omit when using delegated auth (bearer token or OAuth authorization code).
    - `top` (optional): Number of chats to return, up to 50.

**List chat messages**
:   Returns messages in a chat.
    - `chatId` (required): The ID of the chat.
    - `top` (optional): Number of messages to return, up to 50.

**Search messages**
:   Searches for messages across Teams and chats using the Microsoft Graph Search API. It supports Keyword Query Language (KQL) syntax. Requires delegated authentication (bearer token or OAuth authorization code). Not supported with app-only (client credentials) auth.
    - `query` (required): Search query string (for example, `from:alice sent>2024-01-01`).
    - `from` (optional): Offset for pagination.
    - `size` (optional): Number of results to return, up to 25.
    - `enableTopResults` (optional): Sort results by relevance.

**Send channel message** {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6`
:   Posts a new message to a channel. Requires the `ChannelMessage.Send` delegated permission or `ChannelMessage.ReadWrite.All` application permission.
    - `teamId` (required): The ID of the team containing the channel.
    - `channelId` (required): The ID of the channel to post to.
    - `content` (required): The message body text (plain text or HTML, up to 10,000 characters).
    - `contentType` (optional): `"text"` (default) or `"html"`.
    - `subject` (optional): Optional subject line displayed as a message header.

**Send chat message** {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6`
:   Posts a new message to an existing chat (1:1 or group). Requires the `Chat.ReadWrite` delegated permission or `Chat.ReadWrite.All` application permission.
    - `chatId` (required): The ID of the chat to send the message to.
    - `content` (required): The message body text (plain text or HTML, up to 10,000 characters).
    - `contentType` (optional): `"text"` (default) or `"html"`.

**Update message** {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6`
:   Edits the body of an existing channel or chat message. Provide `teamId` and `channelId` for a channel message, or `chatId` for a chat message.
    - `messageId` (required): The ID of the message to update.
    - `teamId` (optional, channel messages): The team ID. Must be provided together with `channelId`.
    - `channelId` (optional, channel messages): The channel ID. Must be provided together with `teamId`.
    - `chatId` (optional, chat messages): The chat ID. Mutually exclusive with `teamId` and `channelId`.
    - `content` (required): The new message body text.
    - `contentType` (optional): `"text"` (default) or `"html"`.

**Get user** {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6`
:   Looks up a user by ID (GUID) or user principal name (UPN, for example `alice@contoso.com`). Useful for resolving an email address to a GUID before calling `createChat`.
    - `userId` (required): The user ID (GUID) or UPN to look up.

**Create chat** {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6`
:   Creates a new 1:1 or group chat and returns the resulting chat object including its `id`. Requires the `Chat.ReadWrite` delegated permission or `Chat.ReadWrite.All` application permission.
    - `chatType` (required): `"oneOnOne"` for a 1:1 direct message (exactly two member IDs: yourself and the other person) or `"group"` for a group chat (yourself plus two or more others).
    - `memberIds` (required): Array of user IDs (GUIDs or UPNs) of all chat members, including yourself (2–20 members).
    - `topic` (optional): Display topic or title for group chats. Ignored for `"oneOnOne"` chats.

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
   - `ChannelMessage.Send` — Send channel messages (required for `sendChannelMessage`)
   - `Chat.ReadWrite` — Send and create chats (required for `sendChatMessage` and `createChat`)
4. Obtain a user access token through the OAuth delegated flow (for example, Authorization Code flow).
5. In the **Microsoft API token** field, enter your user access token.

### OAuth authorization code (delegated auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **Authentication**, select **Add a platform**, choose **Web**, and enter your {{kib}} redirect URI (for example, `https://your-kibana-url/api/actions/connector/_oauth_callback`).
4. Under **API permissions**, add the following **Delegated** permissions for Microsoft Graph:
   - `Team.ReadBasic.All` — List joined teams
   - `Channel.ReadBasic.All` — List channels
   - `Chat.Read` — Read chat messages
   - `ChannelMessage.Read.All` — Read channel messages
   - `offline_access` — Maintain access through refresh tokens
   - `ChannelMessage.Send` — Send channel messages (required for `sendChannelMessage`)
   - `Chat.ReadWrite` — Send and create chats (required for `sendChatMessage` and `createChat`)
5. Copy the **Application (client) ID** and your **tenant ID** from the app registration **Overview** page.
6. Under **Certificates & secrets**, create a new client secret and copy the value.
7. In the connector configuration, enter:
   - **Authorization URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/authorize`
   - **Token URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`
   - **Client ID**: your Application (client) ID
   - **Client Secret**: the secret value from step 6

### OAuth client credentials (app-only auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **API permissions**, add the following **Application** permissions for Microsoft Graph:
   - `Team.ReadBasic.All` — List all teams in the tenant
   - `Channel.ReadBasic.All` — List channels
   - `ChannelMessage.Read.All` — Read channel messages
   - `Chat.Read.All` — Read all chats and messages
   - `ChannelMessage.ReadWrite.All` — Send and update channel messages (required for `sendChannelMessage` and `updateMessage`)
   - `Chat.ReadWrite.All` — Send, create, and update chats (required for `sendChatMessage` and `createChat`)
4. Grant admin consent for the permissions.
5. Under **Certificates & secrets**, create a new client secret.
6. Copy the **Application (client) ID**, **client secret value**, and **tenant ID**. In the connector configuration, enter these values.

### OAuth client credentials with certificate (app-only auth using private key JWT)

Use this method when you want to authenticate without a client secret, using a certificate registered with your Azure AD app. This corresponds to the `oauth_client_credentials_private_key_jwt` auth type in the connector.

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration (or reuse an existing one).
3. Under **API permissions**, add the same **Application** permissions as the OAuth client credentials method above.
4. Grant admin consent for the permissions.
5. Generate a certificate and private key pair (for example, using OpenSSL):
   ```shell
   openssl req -x509 -newkey rsa:4096 -keyout private_key.pem -out certificate.pem -days 365 -nodes
   ```
6. Under **Certificates & secrets → Certificates**, upload the `certificate.pem` public certificate file.
7. In the connector configuration, enter:
   - **Token URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`
   - **Client ID**: your Application (client) ID
   - **Private Key**: the contents of `private_key.pem`
   - **Certificate**: the contents of `certificate.pem` (used to compute the `x5t#S256` thumbprint sent in the JWT assertion)
