---
navigation_title: "Microsoft Teams"
type: reference
description: "Use the Microsoft Teams connector to send messages, search conversations, and browse teams, channels, and chats using the Microsoft Graph API, and to start workflows from channel, chat, and team events."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Microsoft Teams connector [microsoft-teams-connector]

The Microsoft Teams connector connects {{kib}} to Microsoft Teams through the Microsoft Graph API. Agents and workflows can use it to send messages, search conversations, and browse teams, channels, and chats.

You can use this connector in **Agent Builder** and **Workflows**.

Some capabilities of this connector are only available from a certain version:

- {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Quick Connect OAuth 2.0.
- {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Send, update, and create actions to post channel and chat messages, edit a message, look up a user, and create a chat.
- {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Workflow events from Microsoft Graph change notifications.

## Prerequisites [microsoft-teams-prerequisites]

In Microsoft Entra ID, you need an app registration for bearer token, OAuth authorization code, or OAuth client credentials. Quick Connect does not need an app registration.

Registering the app and granting admin consent requires a role that can do both, such as Cloud Application Administrator. Application Developer can register the app and cannot grant admin consent. Teams Administrator cannot register an app.

In {{kib}}, you need:

- The **Actions and Connectors : All** [privilege](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md), to create and edit connectors.
- {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` An Enterprise license and `server.publicBaseUrl` set to the host that Microsoft Graph uses to reach {{kib}}, to receive events. `xpack.actions.inboundEvents.enabled` defaults to `true`. Set it to `false` to turn receive events off. Graph must be able to reach a public HTTPS URL. Graph cannot call `localhost`.

## Create connectors in {{kib}} [define-microsoft-teams-ui]

To use the connector, set up credentials in Microsoft Entra ID (or use Quick Connect), create the connector in {{kib}}, and test it.

### Set up API credentials [microsoft-teams-api-credentials]

#### Quick Connect OAuth 2.0

No setup required. Select **Quick Connect OAuth 2.0** when creating the connector in {{kib}} and follow the authorization prompt to grant Elastic access to your Microsoft Teams workspace.

#### Bearer token (delegated auth)

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

#### OAuth authorization code (delegated auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **Authentication**, select **Add a platform**, choose **Web**, and enter your {{kib}} redirect URI. Copy the following pattern and replace your public {{kib}} hostname. Azure accepts `http://localhost` for a local {{kib}}:

   ```text
   https://<your-kibana-host>/api/actions/connector/_oauth_callback
   ```

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

After you add a permission, sign in to the connector again so the stored token includes it. On edit, {{kib}} asks you to re-enter encrypted fields such as the client secret.

#### OAuth client credentials (app-only auth)

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration.
3. Under **API permissions**, add the following **Application** permissions for Microsoft Graph:
   - `Team.ReadBasic.All` — List all teams in the tenant
   - `Channel.ReadBasic.All` — List channels
   - `ChannelMessage.Read.All` — Read channel messages
   - `Chat.Read.All` — Read all chats and messages
   - `ChannelMessage.ReadWrite.All` — Send and update channel messages (required for `sendChannelMessage` and `updateMessage`)
   - `Chat.ReadWrite.All` — Send, create, and update chats (required for `sendChatMessage` and `createChat`)
4. Select **Grant admin consent**. The permission row must say **Granted**. A permission that was only added is not in the token.
5. Under **Certificates & secrets**, create a new client secret.
6. Copy the **Application (client) ID**, **client secret value**, and **tenant ID**. In the connector configuration, enter these values.

#### OAuth client credentials with certificate (app-only auth using private key JWT)

Use this method when you want to authenticate without a client secret, using a certificate registered with your Azure AD app. This corresponds to the `oauth_client_credentials_private_key_jwt` auth type in the connector.

1. Sign in to the [Azure portal](https://portal.azure.com). Select **Azure Active Directory → App registrations**.
2. Create a new application registration (or reuse an existing one).
3. Under **API permissions**, add the same **Application** permissions as the OAuth client credentials method above.
4. Select **Grant admin consent**. The permission row must say **Granted**.
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

### Connector configuration [microsoft-teams-connector-configuration]

You can create connectors in **{{stack-manage-app}} → {{connectors-ui}}**.

Microsoft Teams connectors support Quick Connect OAuth 2.0, a bearer token, OAuth authorization code, and OAuth client credentials. Select the authentication type when you create or edit the connector.

#### Quick Connect OAuth 2.0 (recommended)
```{applies_to}
serverless: preview
stack: preview 9.6
```

Elastic's managed OAuth flow for Microsoft Teams. No app setup is required. Select this option and authorize access to your Microsoft Teams workspace through Elastic. Provides delegated access (the connector acts as the authenticated user) with the same permissions as the OAuth authorization code method. Your Microsoft 365 administrator might need to grant consent for the Elastic app. Refer to [Quick Connect OAuth 2.0](/reference/connectors-kibana/quick-connect-oauth.md).

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

### Connector networking configuration [microsoft-teams-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), add `graph.microsoft.com` and `login.microsoftonline.com` to the list.

### Test the connector [microsoft-teams-action-configuration]

You can test connectors while creating or editing them in {{kib}}. The test verifies connectivity by listing the authenticated user's joined teams when using delegated auth, or all teams in the tenant when using app-only auth.

## Connector actions [microsoft-teams-connector-actions]

The Microsoft Teams connector has the following actions.

**List joined teams**
:   Returns the authenticated user's joined teams when using delegated auth, or the specified user's joined teams when `userId` is provided for app-only auth.
    - `userId` (optional): User ID for app-only auth through client credentials. Omit when using delegated auth (Quick Connect OAuth 2.0, bearer token, or OAuth authorization code).

**List channels**
:   Returns channels for the specified team.
    - `teamId` (required): The ID of the team.

**List channel messages**
:   Returns messages in a channel. The action returns the newest root messages, up to 50, not one message by id. A reply is not in that page.
    - `teamId` (required): The ID of the team.
    - `channelId` (required): The ID of the channel.
    - `top` (optional): Number of messages to return, up to 50.

**List chats**
:   Returns chats for the authenticated user.
    - `userId` (optional): User ID for app-only auth through client credentials. Omit when using delegated auth (Quick Connect OAuth 2.0, bearer token, or OAuth authorization code).
    - `top` (optional): Number of chats to return, up to 50.

**List chat messages**
:   Returns messages in a chat. The action returns the newest messages, up to 50, not one message by id. It reads chats the signed-in user belongs to.
    - `chatId` (required): The ID of the chat.
    - `top` (optional): Number of messages to return, up to 50.

**Search messages**
:   Searches for messages across Teams and chats using the Microsoft Graph Search API. It supports Keyword Query Language (KQL) syntax. Requires delegated authentication (Quick Connect OAuth 2.0, bearer token, or OAuth authorization code). Not supported with app-only (client credentials) auth.
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

## Receive Microsoft Teams events [microsoft-teams-inbound-events]
```{applies_to}
serverless: preview
stack: preview 9.6+
```

The connector can start a workflow from a Microsoft Graph change notification. A saved connector does not receive events until **Receive events** is turned on for that connector. After you save a new connector, {{kib}} shows the **Webhook URL** and the ingest token once, so copy them then. For an existing connector, save it, then select **Rotate ingest token**. A new token stops the previous one from working. Update the subscription URL after you rotate. Turning **Receive events** off and saving stops the webhook URL immediately. Workflows bound to this connector stop getting events. Outbound actions keep working.

This toggle appears when `xpack.actions.inboundEvents.enabled` is `true`. {{kib}} does not create or renew the Graph subscription. To send events from Microsoft Graph, refer to [Start a workflow from Microsoft Teams events](#microsoft-teams-inbound-howto).

The ingest token authenticates the webhook request. The workflow runs with the identity of the last user who saved the connector. The token is separate from the connector's outbound credentials.

The connector supports five events. A workflow subscribes to an event by using its ID as the trigger `type`.

| Workflow event | When it runs | Fields |
| --- | --- | --- |
| `microsoft-teams.channel_message` | A message is posted in a channel | `team_id`, `channel_id`, `message_id`, optional `tenant_id` |
| `microsoft-teams.chat_message` | A message is posted in a chat | `chat_id`, `message_id`, optional `tenant_id` |
| `microsoft-teams.channel_created` | A channel is created | `team_id`, `channel_id`, optional `tenant_id` |
| `microsoft-teams.chat_created` | A chat is created | `chat_id`, optional `tenant_id` |
| `microsoft-teams.team_member_added` | A user is added to a team | `team_id`, `user_id`, optional `tenant_id` |

`tenant_id` is present when Graph sends `tenantId`. On a team member event, `user_id` is `resourceData.userId` when Graph sends it. A basic notification omits that field. The membership id is base64 of `{team-id}##{user-id}` or `0##{tenant-id}##{user-id}`, and {{kib}} reads the user id from that value. Adding a member to a channel does not start this event. A reply in a channel uses `microsoft-teams.channel_message`. `message_id` is the reply id, from the `replies` segment of the resource path.

Only `created` starts one of these workflows. Edits, deletes, chat members, and channel members do not. A notification that matches none of these events does not start a workflow. {{kib}} reads the ids from the resource path and `resourceData`. `encryptedContent`, when Graph includes it, is ignored. The event does not include the message body, content type, or sender.

One Graph request can start at most `xpack.actions.inboundEvents.maxEmitted` workflows. The default is 25 and the maximum is 250. {{kib}} rejects a larger batch and starts no workflow from it. The HTTP response is 500, with the body `Unable to process inbound connector event request.` That same response is used for other processing failures, so HTTP 500 alone does not mean the batch was too large. Microsoft Graph retries the request. A subscription to one team, channel, or chat usually stays under the default. For a tenant-wide resource such as `/teams/getAllMessages` or `/chats/getAllMessages`, set the value in `kibana.yml` to the largest batch you expect, up to 250:

```yaml
xpack.actions.inboundEvents.maxEmitted: 100
```

### Webhook URL and authentication [microsoft-teams-inbound-url]

Microsoft Graph sends each notification to the webhook URL of the connector. The **Webhook URL** field does not include the ingest token. Graph does not send an `Authorization` header, so append the token yourself. Use that full URL for both `notificationUrl` and `lifecycleNotificationUrl`.

The URL has one of these shapes. The default space has no `/s/<space-id>` prefix.

```text
https://<kibana-host>/api/actions/events/.microsoft-teams/<connector-id>?token=<ingest-token>
https://<kibana-host>/s/<space-id>/api/actions/events/.microsoft-teams/<connector-id>?token=<ingest-token>
```

## Start a workflow from Microsoft Teams events [microsoft-teams-inbound-howto]
```{applies_to}
serverless: preview
stack: preview 9.6+
```

To run a {{kib}} workflow when a channel message, chat message, channel, chat, or team member is created in Microsoft Teams, create a Graph subscription and point it at the webhook URL. {{kib}} does not create the subscription for you.

Before you start, meet the requirements in [Receive Microsoft Teams events](#microsoft-teams-inbound-events) and turn on **Receive events** on the connector. Create the subscription after the connector is saved. A post that was sent before the subscription existed is not delivered.

### Find the team, channel, chat, and user ids [microsoft-teams-inbound-ids]

Team id
:   In Teams, open the channel and select **Get link to channel**. `groupId` in that link is the team id. It is a GUID (`8-4-4-4-12`). You can also call `GET https://graph.microsoft.com/v1.0/me/joinedTeams` and read `id`.

Channel id
:   In the same link, decode the segment after `/channel/`. Replace `%3a` with `:` and `%40` with `@`, so `19%3aabc%40thread.tacv2` becomes `19:abc@thread.tacv2`. For the General channel, `GET https://graph.microsoft.com/v1.0/teams/{team-id}` returns that id in `internalId`. `GET https://graph.microsoft.com/v1.0/teams/{team-id}/channels` lists every channel.

Chat id
:   Call `GET https://graph.microsoft.com/v1.0/me/chats` with the user who will own the subscription. An empty `value` array means that user has not opened a chat yet. Start a chat in Teams, send one message, and call it again. Copy the `id` that starts with `19:`.

User id
:   Call `GET https://graph.microsoft.com/v1.0/me` and copy `id`. Use it in `users/{user-id}/chats`.

### Create the Graph subscription [microsoft-teams-inbound-subscription]

Create the subscription with `POST https://graph.microsoft.com/v1.0/subscriptions`. Set `changeType` to `created`. Set `notificationUrl` and `lifecycleNotificationUrl` to the webhook URL including `?token=`. Set `expirationDateTime` at most 4,320 minutes (3 days) ahead. An expiration more than 1 hour ahead requires `lifecycleNotificationUrl`. Renew the subscription in Graph before `subscriptionExpirationDateTime`. {{kib}} does not renew it.

`clientState` is optional and at most 128 characters. Set it to a secret. Graph sends that value back on each notification. {{kib}} does not read it.

A subscription to one team, channel, chat, or user can be created in [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) while you are signed in as a member of that team. **Modify permissions** lists only the permissions for the request currently in the address bar. Point the request at the resource you are subscribing to, consent to the delegated permission in the table below, then change the method to **POST** `https://graph.microsoft.com/v1.0/subscriptions` and paste the body. `GET https://graph.microsoft.com/v1.0/subscriptions` lists subscriptions for that signed-in user. Another account receives **ResourceNotFound**.

A tenant-wide resource (`/teams/getAllMessages`, `/teams/getAllChannels`, `/chats`, `/chats/getAllMessages`) rejects a signed-in user token. Graph returns Forbidden with `OnBehalfOfUser`. Create it with an application token:

1. On the Entra app, add the application permission from the table and select **Grant admin consent**. The permission row must say **Granted**. A permission that only says it was added is not in the token.
2. Request a new token after consent. A token issued earlier still lacks the permission. Call `POST https://graph.microsoft.com/v1.0/subscriptions` with `Authorization: Bearer` and that `access_token`.

   ```bash
   curl -s -X POST \
     "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=<client-id>" \
     -d "client_secret=<client-secret>" \
     -d "scope=https://graph.microsoft.com/.default" \
     -d "grant_type=client_credentials"
   ```

Example subscription for messages in one channel:

```json
{
  "changeType": "created",
  "notificationUrl": "https://<kibana-host>/api/actions/events/.microsoft-teams/<connector-id>?token=<ingest-token>",
  "lifecycleNotificationUrl": "https://<kibana-host>/api/actions/events/.microsoft-teams/<connector-id>?token=<ingest-token>",
  "resource": "teams/{team-id}/channels/{channel-id}/messages",
  "expirationDateTime": "<up to 3 days from now>",
  "clientState": "<secret>"
}
```

Subscribe to one of these resources. Tenant-wide resources accept application permissions only. A subscription to one team, channel, chat, or user accepts delegated or application permissions. `/users/{user-id}/chats/getAllMessages` also accepts delegated `Chat.Read`.

`/chats` starts `microsoft-teams.chat_created` for every new chat in the tenant. It does not deliver messages. `/chats/{chat-id}` watches that existing chat only. `/users/{user-id}/chats` watches new chats for one person and accepts delegated `Chat.Read`. `/chats/getAllMessages` starts `microsoft-teams.chat_message` for every new message in every chat.

| Workflow event | Application (tenant-wide) | One resource |
| --- | --- | --- |
| Channel message posted | `/teams/getAllMessages` | `/teams/{team-id}/channels/{channel-id}/messages` |
| Chat message received | `/chats/getAllMessages` or `/users/{id}/chats/getAllMessages` | `/chats/{chat-id}/messages` |
| Channel created | `/teams/getAllChannels` | `/teams/{team-id}/channels` |
| Chat created | `/chats` | `/users/{user-id}/chats` |
| Team member added | — | `/teams/{team-id}/members` |

Grant the application permission on the Entra app and give admin consent. Delegated permissions apply only to the one-resource column.

| Workflow event | Application permission | Delegated permission (one resource) |
| --- | --- | --- |
| Channel message posted | `ChannelMessage.Read.All` | `ChannelMessage.Read.All` |
| Chat message received | `Chat.Read.All` | `Chat.Read` or `Chat.ReadWrite` |
| Channel created | `Channel.ReadBasic.All` | `Channel.ReadBasic.All` |
| Chat created | `Chat.ReadBasic.All` or `Chat.Read.All` | `Chat.ReadBasic` or `Chat.Read` |
| Team member added | `TeamMember.Read.All` | `TeamMember.Read.All` |

Quick Connect and the other delegated methods already include `ChannelMessage.Read.All`, `Channel.ReadBasic.All`, and `Chat.Read`. They do not include `TeamMember.Read.All`. Add that permission and consent again before subscribing to team members.

Tenant-wide message subscriptions (`/teams/getAllMessages` and `/chats/getAllMessages`) follow Microsoft's [protected Teams APIs](https://learn.microsoft.com/en-us/graph/teams-protected-apis) and license rules. Use a one-resource subscription when the tenant-wide resource is unavailable. An organization can have at most 10,000 Teams subscriptions.

### Confirm that Graph calls {{kib}} [microsoft-teams-inbound-confirm]

When you create the subscription, Graph validates the URL with `POST {notificationUrl}?validationToken=<value>`. {{kib}} answers HTTP 200, `Content-Type: text/plain`, and the token as the body. That request does not start a workflow. A **201 Created** response from Graph means validation succeeded. Teams itself shows nothing. Open the workflow execution to see the event.

A lifecycle notification (`reauthorizationRequired`, `subscriptionRemoved`, or missed) is acknowledged with HTTP 202 and does not start a workflow.

- **HTTP 404.** The ingest token does not match the connector, or **Receive events** was not saved before the token was rotated.
- **HTTP 202.** {{kib}} accepted the notification. The workflow must be enabled and subscribed to that event id, such as `microsoft-teams.channel_message`.
- **A message in an existing chat does not start `microsoft-teams.chat_created`.** The subscription resource is `/chats`, which fires when a chat is created. Subscribe to `/chats/getAllMessages` or `/chats/{chat-id}/messages` for messages.
- **Forbidden with `OnBehalfOfUser`.** The resource is tenant-wide and the token is a signed-in user. Use an application token.
- **Forbidden, required application permissions are missing.** Admin consent is not **Granted**, or the token was issued before consent. Grant consent and request a new token.

### Read the message subject and body [microsoft-teams-inbound-message-text]

The event does not include the post text. After `microsoft-teams.channel_message`, call **List channel messages** with `event.team_id` and `event.channel_id`. After `microsoft-teams.chat_message`, call **List chat messages** with `event.chat_id`. These actions use the connector's outbound credentials from [Set up API credentials](#microsoft-teams-api-credentials). The ingest token does not read message text.

Each action returns the newest messages, up to 50, not one message by id. Select the item whose `id` equals `event.message_id`. On that item, `subject` is plain text and `body.content` is HTML (`<p>yeah</p>`). The item can be missing when the message is no longer in the newest page. A channel reply is not in the **List channel messages** page.

**List chat messages** reads chats the signed-in user belongs to. A tenant-wide chat subscription can deliver a message from a chat that user is not in. Graph then returns 403. Sign in to the connector again after you add `Chat.Read`, so the stored token includes it.

### Subscribe a workflow to an event [microsoft-teams-inbound-subscribe]

Replace `<connector-id>` with the connector instance id. `"*"` subscribes to every connector of this type. `execution.triggeredBy` is the event id. For a channel or chat message, the later steps load `subject` and `body.content`.

```yaml
version: "1"
name: Teams events
enabled: true
triggers:
  - type: microsoft-teams.channel_message
    connector-id: "<connector-id>"
  - type: microsoft-teams.chat_message
    connector-id: "<connector-id>"
  - type: microsoft-teams.channel_created
    connector-id: "<connector-id>"
  - type: microsoft-teams.chat_created
    connector-id: "<connector-id>"
  - type: microsoft-teams.team_member_added
    connector-id: "<connector-id>"

steps:
  - name: received
    type: data.set
    with:
      event: "{{ execution.triggeredBy }}"
      team_id: "{{ event.team_id | default: '' }}"
      channel_id: "{{ event.channel_id | default: '' }}"
      chat_id: "{{ event.chat_id | default: '' }}"
      message_id: "{{ event.message_id | default: '' }}"
      user_id: "{{ event.user_id | default: '' }}"
      tenant_id: "{{ event.tenant_id | default: '' }}"

  - name: load_channel_messages
    type: microsoft-teams.listChannelMessages
    connector-id: "{{ event.connectorId }}"
    if: "${{ execution.triggeredBy == 'microsoft-teams.channel_message' }}"
    with:
      teamId: "{{ event.team_id }}"
      channelId: "{{ event.channel_id }}"
      top: 50

  - name: channel_post
    type: data.set
    if: "${{ execution.triggeredBy == 'microsoft-teams.channel_message' }}"
    with:
      subject: "${{ steps.load_channel_messages.output.value | where: 'id', event.message_id | map: 'subject' | first }}"
      body: "${{ steps.load_channel_messages.output.value | where: 'id', event.message_id | map: 'body' | map: 'content' | first }}"

  - name: load_chat_messages
    type: microsoft-teams.listChatMessages
    connector-id: "{{ event.connectorId }}"
    if: "${{ execution.triggeredBy == 'microsoft-teams.chat_message' }}"
    with:
      chatId: "{{ event.chat_id }}"
      top: 50

  - name: chat_post
    type: data.set
    if: "${{ execution.triggeredBy == 'microsoft-teams.chat_message' }}"
    with:
      subject: "${{ steps.load_chat_messages.output.value | where: 'id', event.message_id | map: 'subject' | first }}"
      body: "${{ steps.load_chat_messages.output.value | where: 'id', event.message_id | map: 'body' | map: 'content' | first }}"
```

### Test with a sample event [microsoft-teams-inbound-example]

POST this body to the ingest URL. It starts `microsoft-teams.channel_message` with `team_id` `team-1`, `channel_id` `channel-1`, `message_id` `message-1`, and `tenant_id` `tenant-1`.

```bash
curl -X POST \
  'https://<kibana-host>/api/actions/events/.microsoft-teams/<connector-id>?token=<ingest-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "value": [
      {
        "id": "notification-1",
        "changeType": "created",
        "tenantId": "tenant-1",
        "resource": "teams/team-1/channels/channel-1/messages/message-1",
        "resourceData": {
          "@odata.type": "#Microsoft.Graph.chatMessage",
          "id": "message-1"
        }
      }
    ]
  }'
```

When you test the trigger in the workflow editor, use the emitted fields as the sample event:

```json
{
  "team_id": "team-1",
  "channel_id": "channel-1",
  "message_id": "message-1",
  "tenant_id": "tenant-1"
}
```
