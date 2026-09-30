---
navigation_title: "Slack (v2)"
type: reference
description: "Use the Slack (v2) connector to search messages, list channels, fetch channel history, look up channel and user metadata, list and look up files, send messages, create channels, and invite users to Slack channels using the Slack Web API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Slack (v2) connector [slack-v2-action-type]

The Slack (v2) connector enables workflow-driven Slack automation: search Slack messages, list conversations the token can access, resolve channel IDs from names, send messages, create channels, and invite users to Slack channels using the Slack Web API. It supports three authentication methods: Quick Connect OAuth 2.0 (recommended), OAuth Authorization Code (Slack OAuth v2), and Bot Token.

## Create connectors in {{kib}} [define-slack-v2-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [slack-v2-connector-configuration]

Slack (v2) connectors support three authentication methods:

Quick Connect OAuth 2.0 (recommended) {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6`
:   Elastic's managed OAuth flow. Select this option and authorize access to your Slack workspace through Elastic. No app setup is required.

OAuth Authorization Code
:   Slack's OAuth v2 flow using your own Slack app. You will be redirected to Slack to authorize access to your workspace. Requires a Slack app with a Client ID, Client Secret, and the appropriate user token scopes. See [Get API credentials (OAuth)](#slack-v2-api-credentials-oauth) for setup steps.

Bot Token
:   A long-lived Slack bot token (format: `xoxb-...`) from a Slack app. Paste the token directly — no OAuth redirect is required. See [Get API credentials (Bot Token)](#slack-v2-api-credentials-bot-token) for setup steps.

::::{note}
The **Search messages** action requires a user token and is not available when using Bot Token authentication. Use **Get conversation history** to read messages from a specific channel instead.
::::

## Receive Slack events [slack-v2-inbound-events]
```{applies_to}
serverless: unavailable
stack: preview 9.6+
```

The connector can start a workflow from a Slack Events API `event_callback`. A saved Slack connector does not receive events until **Receive events** is turned on for that connector.

| Workflow event | Slack `event.type` | Fields |
| --- | --- | --- |
| `slack2.message` | `message` | `workspace`, `channel`, `messageId`, `threadId`, `sender`, `text`, `subtype`, `botId` |
| `slack2.app_mention` | `app_mention` | `workspace`, `channel`, `messageId`, `threadId`, `sender`, `text` |
| `slack2.reaction_added` | `reaction_added` | `channel`, `messageId`, `fileId`, `fileCommentId`, `itemType`, `user`, `reaction` |
| `slack2.file_shared` | `file_shared` | `fileId`, `user`, `channel` |
| `slack2.file_public` | `file_public` | `fileId`, `userId` |
| `slack2.channel_created` | `channel_created` | `channelId`, `name`, `creator` |
| `slack2.team_join` | `team_join` | `userId`, `name`, `realName`, `displayName`, `email` |
| `slack2.member_joined_channel` | `member_joined_channel` | `userId`, `channelId`, `inviter` |

`threadId`, `sender`, `text`, `subtype`, and `botId` are present only when Slack sends them. The same applies to `channel` on a shared file, `userId` on a file made public, and `inviter` on a channel join. A reaction includes `channel` and `messageId` when it is on a message, and `fileId` or `fileCommentId` when it is on a file or file comment. An event type that is not in this table does not start a workflow.

Slack's Request URL check sends `url_verification`. The connector responds with HTTP 200 and `{ "challenge": "<value>" }` and does not start a workflow.

Example `app_mention` body:

```json
{
  "type": "event_callback",
  "team_id": "T123",
  "event_id": "Ev123",
  "event": {
    "type": "app_mention",
    "user": "U123",
    "text": "<@UAPP> hello",
    "ts": "1515449522.000016",
    "channel": "C123"
  }
}
```

That payload emits `slack2.app_mention` with `workspace`, `channel`, `messageId`, `sender`, and `text`.

## Test connectors [slack-v2-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by calling Slack `auth.test`.

The Slack (v2) connector has the following actions:

Search messages
:   Search for messages in Slack.
    - `query` (required): Slack search query string.
    - `inChannel` (optional): Adds `in:<channel_name>` to the query.
    - `fromUser` (optional): Adds `from:<@UserID>` or `from:username` to the query.
    - `after` (optional): Adds `after:<date>` to the query (for example, `2026-02-10`).
    - `before` (optional): Adds `before:<date>` to the query (for example, `2026-02-10`).
    - `sort` (optional): Sort order, `score` or `timestamp`.
    - `sortDir` (optional): Sort direction, `asc` or `desc`.
    - `count` (optional): Results to return (1 to 20). Slack returns up to 20 results per page.
    - `cursor` (optional): Pagination cursor (use `response_metadata.next_cursor` from a previous call).
    - `includeContextMessages` (optional): Include contextual messages. Defaults to `true`.
    - `includeBots` (optional): Include bot messages. Defaults to `false`.
    - `includeMessageBlocks` (optional): Include Block Kit blocks. Defaults to `true`.
    - `raw` (optional): If `true`, returns the full raw Slack response (verbose).

List channels
:   List Slack conversations the token can see (one page per call), using Slack `conversations.list`. Use this to browse channel IDs or answer which channels exist. When the response includes `hasMore: true`, call **List channels** again with `nextCursor` from the previous response.
    - `types` (optional): Conversation types to include: `public_channel`, `private_channel`, `im`, `mpim`. Defaults to `public_channel` only. If you pass an empty array, it defaults to `public_channel`.
    - `excludeArchived` (optional): Exclude archived conversations. Defaults to `true`.
    - `cursor` (optional): Pagination cursor from a previous **List channels** response (`nextCursor`). Omit for the first page.
    - `limit` (optional): Conversations per page (1 to 1000). Defaults to `1000`.
    - `raw` (optional): If `true`, returns the full raw Slack API response instead of a compact result. Defaults to `false`.

Resolve channel ID
:   Resolve a Slack conversation ID (`C...` for public channels, `G...` for private channels) from a human channel name (for example, `#general`).
    - `name` (required): Channel name (with or without `#`).
    - `types` (optional): Conversation types to search. Defaults to `public_channel`.
    - `match` (optional): `exact` (default) or `contains`.
    - `excludeArchived` (optional): Exclude archived channels. Defaults to `true`.
    - `cursor` (optional): Pagination cursor to resume a previous scan.
    - `limit` (optional): Channels per page (1 to 1000). Defaults to `1000`.
    - `maxPages` (optional): Maximum pages to scan before giving up. Defaults to `10`.

Get conversation history
:   Fetch a page of recent messages from a Slack channel or DM using Slack `conversations.history`. Returns messages newest-first. When the response includes `hasMore: true`, call **Get conversation history** again with `nextCursor` from the previous response.
    - `channel` (required): Conversation ID (for example, `C123...` for channels, `G...` for private channels, `D...` for DMs).
    - `oldest` (optional): Only messages after this Unix timestamp (string form, for example `1234567890.123456`).
    - `latest` (optional): Only messages before this Unix timestamp (string form).
    - `inclusive` (optional): Include messages with the `oldest` or `latest` timestamps in results.
    - `limit` (optional): Messages per page (1 to 1000). Defaults to `100`.
    - `cursor` (optional): Pagination cursor from a previous response (`nextCursor`). Omit for the first page.
    - `raw` (optional): If `true`, returns the full raw Slack response. Defaults to `false`.

Get conversation info
:   Look up metadata for a single Slack channel or DM by ID using Slack `conversations.info`. Returns the channel object (name, privacy, membership, topic, purpose).
    - `channel` (required): Conversation ID.
    - `includeNumMembers` (optional): Set to `true` to include the member count in the channel object.
    - `includeLocale` (optional): Set to `true` to include the channel locale.
    - `raw` (optional): If `true`, returns the full raw Slack response instead of just the channel object. Defaults to `false`.

Look up user by email
:   Find a Slack user by email address using Slack `users.lookupByEmail`. Throws if no user has that email.
    - `email` (required): Email address of the user to look up.
    - `raw` (optional): If `true`, returns the full raw Slack response instead of just the user object. Defaults to `false`.

List users
:   List Slack workspace users (one page per call) using Slack `users.list`. When the response includes `hasMore: true`, call **List users** again with `nextCursor` from the previous response.
    - `limit` (optional): Users per page (1 to 1000). Defaults to `200`.
    - `cursor` (optional): Pagination cursor from a previous response.
    - `includeLocale` (optional): Set to `true` to include the user locale.
    - `raw` (optional): If `true`, returns the full raw Slack response.

Who am I
:   Return the identity the connector is currently authenticated as, using Slack `auth.test`. Useful before a write action to confirm the workspace/user, or to resolve "me" to a concrete `user_id`.
    - `raw` (optional): If `true`, returns the full raw Slack response. Defaults to `false`.

Get file info
:   Look up a single Slack file by ID using Slack `files.info`. Returns the file metadata (name, mimetype, size, URLs, sharing channels).
    - `file` (required): Slack file ID (for example, `F0123ABCDE`).
    - `raw` (optional): If `true`, returns the full raw Slack response instead of the file object. Defaults to `false`.

List files
:   List Slack files (one page per call) using Slack `files.list`. Filter by channel, user, time range, or types. Slack `files.list` is classic-paginated, so this action uses `page`/`pages` rather than cursors.
    - `channel` (optional): Restrict results to a single channel/DM ID.
    - `user` (optional): Restrict results to files uploaded by a single user ID.
    - `tsFrom` (optional): Only include files created after this Unix timestamp (string form).
    - `tsTo` (optional): Only include files created before this Unix timestamp (string form).
    - `types` (optional): Comma-separated Slack file type filter (for example, `images,pdfs`).
    - `count` (optional): Files per page (1 to 200). Defaults to `100`.
    - `page` (optional): 1-indexed page number. Defaults to `1`. Use `nextPage` from the previous response to walk pages.
    - `raw` (optional): If `true`, returns the full raw Slack response.

List user conversations
:   List the channels a Slack user is a member of (one page per call) using Slack `users.conversations`. Omit `user` to list for the authenticated user.
    - `user` (optional): User ID (for example, `U...`) whose conversations to list.
    - `types` (optional): Conversation types to list (`public_channel`, `private_channel`, `im`, `mpim`). Defaults to all four — DMs and private channels are usually the more interesting answer for a per-user query.
    - `excludeArchived` (optional): Exclude archived channels. Defaults to `true`.
    - `limit` (optional): Channels per page (1 to 1000). Defaults to `1000`.
    - `cursor` (optional): Pagination cursor from a previous response.
    - `raw` (optional): If `true`, returns the full raw Slack response.

Create conversation
:   Create a new Slack channel (public or private).
    - `name` (required): Channel name. Must contain only lowercase letters, numbers, hyphens, and underscores (80 characters or fewer).
    - `isPrivate` (optional): Whether to create a private channel. Defaults to `false`.

Invite to conversation
:   Invite users to a Slack channel.
    - `channel` (required): The channel ID to invite users to (for example, `C123...` or `G456...`).
    - `users` (required): Comma-separated list of user IDs to invite (for example, `U01PWE77HD2,U02ABC1234`).

Send message
:   Send a message to a Slack conversation ID.
    - `channel` (required): Conversation ID (for example, `C123...`). Use **List channels** to browse IDs, or **Resolve channel ID** if you know the channel name.
    - `text` (required): Message text.
    - `threadTs` (optional): Reply in a thread (timestamp of the parent message).
    - `unfurlLinks` (optional): Turn on unfurling of primarily text-based content.
    - `unfurlMedia` (optional): Turn on unfurling of media content.

Send Block Kit message
:   {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Send a structured [Block Kit](https://api.slack.com/reference/block-kit/blocks) message to a Slack conversation using Slack `chat.postMessage`. Use this instead of **Send message** when you need formatted cards, buttons, sections, or images.
    - `channel` (required): Conversation ID to post to (for example, `C...` for channels, `G...` for private channels, `D...` for DMs).
    - `blocks` (required): Array of Slack Block Kit block objects (for example, `section`, `actions`, `image`). Maximum 50 blocks per message.
    - `text` (optional): Fallback plain-text summary shown in notifications and accessibility contexts where blocks cannot render. Strongly recommended for accessibility.
    - `threadTs` (optional): Timestamp of another message to reply to (creates a threaded reply).
    - `unfurlLinks` (optional): Turn on unfurling of primarily text-based content.
    - `unfurlMedia` (optional): Turn on unfurling of media content.

Get conversation replies
:   {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Fetch replies in a message thread using Slack `conversations.replies`. Returns the full thread including the parent message itself. When the response includes `hasMore: true`, call **Get conversation replies** again with `nextCursor` from the previous response.
    - `channel` (required): Conversation ID that contains the thread (for example, `C...` for channels, `G...` for private channels, `D...` for DMs).
    - `ts` (required): Timestamp of the parent message that started the thread (for example, `"1234567890.123456"`). This is the `threadTs` returned by **Send message** or **Send Block Kit message**.
    - `oldest` (optional): Only replies after this Unix timestamp (string form).
    - `latest` (optional): Only replies before this Unix timestamp (string form).
    - `inclusive` (optional): Include messages with the `oldest` or `latest` timestamps.
    - `limit` (optional): Replies per page (1 to 1000). Defaults to `100`.
    - `cursor` (optional): Pagination cursor from a previous response. Omit for the first page.
    - `raw` (optional): If `true`, returns the full raw Slack response.

Update message
:   {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Edit an existing Slack message in-place using Slack `chat.update`. Use this to change alert state (for example, from "open" to "acknowledged") without posting a new message.
    - `channel` (required): Conversation ID that contains the message to update.
    - `ts` (required): Timestamp of the message to update (for example, `"1234567890.123456"`). Use the timestamp from a previous **Send message** or **Send Block Kit message** response.
    - `text` (optional): New plain-text content for the message. Required when `blocks` is omitted.
    - `blocks` (optional): New Block Kit blocks for the message. Required when `text` is omitted.

::::{note}
At least one of `text` or `blocks` must be provided.
::::

Add reaction
:   {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Add an emoji reaction to a Slack message using Slack `reactions.add`. Use this as a lightweight acknowledgement signal (for example, `eyes` when seen, `white_check_mark` when resolved) without posting a new message.
    - `channel` (required): Conversation ID that contains the message to react to.
    - `timestamp` (required): Timestamp of the message to react to (for example, `"1234567890.123456"`). Use the timestamp from a previous **Send message** response.
    - `name` (required): Emoji name without surrounding colons (for example, `thumbsup`, `white_check_mark`, `eyes`).

Upload file
:   {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Upload a file to Slack and optionally share it into a channel using Slack `files.getUploadURLExternal`. Supports text and binary files up to approximately 2 MB.
    - `filename` (required): Name of the file to upload (for example, `incident-report.txt`, `screenshot.png`).
    - `content` (required): File content to upload. For text files (logs, reports, code), pass the raw text. For binary files, pass base64-encoded content and set `encoding` to `"base64"`. Maximum approximately 2 MB.
    - `encoding` (optional): Encoding of the `content` field. Use `"utf8"` (default) for plain text; use `"base64"` for binary files.
    - `channel` (optional): Conversation ID to share the uploaded file into (for example, `C...`). Omit to upload without sharing.
    - `title` (optional): Display title for the file in Slack.
    - `initialComment` (optional): Message text to accompany the file when it is shared into a channel.
    - `threadTs` (optional): Thread timestamp to share the file into a thread.

Ask question
:   {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` Post a human-in-the-loop prompt with response buttons to a Slack conversation or user using Slack `chat.postMessage`. Use this when an automated workflow needs a human decision before continuing.
    - `channel` (required): Conversation ID or user ID (`U...`) to post the question to. Use **Look up user by email** to get a user ID for direct-message delivery.
    - `question` (required): The question or prompt text to display to the human respondent.
    - `buttons` (required): Response options shown as buttons. Provide 1 to 10 buttons. Each button requires:
      - `text` (required): Button label displayed in Slack (max 75 characters).
      - `value` (required): Machine-readable value submitted when this button is clicked (max 200 characters).
      - `style` (optional): Visual style — `"primary"` (green) for the preferred action, `"danger"` (red) for destructive actions. Omit for neutral.
    - `threadTs` (optional): Timestamp of another message to post the question as a threaded reply.

## Connector networking configuration [slack-v2-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), include `slack.com` in the list.

## Get API credentials (OAuth) [slack-v2-api-credentials-oauth]

To use OAuth Authorization Code authentication, you need a Slack app configured for OAuth.

1. Go to [Slack API: Your Apps](https://api.slack.com/apps) and select **Create New App**.
2. Choose **From scratch**, give it a name (for example, "Kibana Slack Connector"), and select your workspace.
3. Under **OAuth & Permissions**, add the following **User Token Scopes**:
   - `channels:read` — list and resolve public channel IDs
   - `channels:history` — read public channel history (for **Get conversation history**)
   - `chat:write` — send messages
   - `files:read` — access shared files (for **Get file info**, **List files**)
   - {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` `files:write` — upload files (for **Upload file**)
   - `groups:read` — list private channels (including for **List channels** when `types` includes `private_channel`)
   - `groups:history` — read private channel history (for **Get conversation history** on private channels)
   - `im:read` — list direct messages (when `types` includes `im`)
   - `im:history` — read DM history (for **Get conversation history** on DMs)
   - `mpim:read` — list group direct messages (when `types` includes `mpim`)
   - `mpim:history` — read group DM history (for **Get conversation history** on group DMs)
   - {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` `reactions:write` — add emoji reactions to messages (for **Add reaction**)
   - `search:read.files` — search files
   - `search:read.im` — search direct messages
   - `search:read.mpim` — search group direct messages
   - `search:read.private` — search private channels
   - `search:read.public` — search public channels
   - `users:read` — look up user information (for **List users**, **List user conversations**)
   - `users:read.email` — look up users by email (for **Look up user by email**)
4. Set the **Redirect URL** to your Kibana OAuth redirect URI.
5. Under **Basic Information**, copy the **Client ID** and **Client Secret**.
6. In {{kib}}, enter the Client ID and Client Secret when creating the Slack (v2) connector. You will be redirected to Slack to authorize access to your workspace.

::::{note}
Additional scopes may be required for certain actions. For example, `groups:write` is needed to create private channels or invite users. Add scopes as needed under **User Token Scopes** in your Slack app configuration.
::::

## Get API credentials (Bot Token) [slack-v2-api-credentials-bot-token]

To use Bot Token authentication, you need a Slack app with a bot token.

1. Go to [Slack API: Your Apps](https://api.slack.com/apps) and select **Create New App**.
2. Choose **From scratch**, give it a name (for example, "Kibana Bot"), and select your workspace.
3. Under **OAuth & Permissions**, add the following **Bot Token Scopes**:
   - `channels:read` — list public channels
   - `channels:history` — read public channel message history
   - `chat:write` — send messages as the bot
   - `files:read` — access file metadata
   - {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` `files:write` — upload files (for **Upload file**)
   - `groups:read` — list private channels the bot is a member of
   - `groups:history` — read private channel history
   - `im:read` — list direct messages with the bot
   - `im:history` — read DM history
   - `mpim:read` — list group direct messages
   - `mpim:history` — read group DM history
   - {applies_to}`serverless: preview` {applies_to}`stack: preview 9.6+` `reactions:write` — add emoji reactions to messages (for **Add reaction**)
   - `users:read` — look up user information
   - `users:read.email` — look up users by email
4. Under **OAuth & Permissions**, select **Install to Workspace** and authorize the app.
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`).
6. In {{kib}}, paste the token into the **Slack Bot Token** field when creating the connector.

::::{note}
Bot tokens cannot search across the workspace — the **Search messages** action is not supported with bot token authentication. Use **Get conversation history** to read messages from channels the bot is a member of. To use **Get conversation history** on a private channel, the bot must first be invited to that channel.
::::

::::{note}
The scopes above enable all read and messaging actions out of the box. Additional write scopes are required for channel-management actions:
- `channels:manage` — required for **Create conversation** (public channels)
- `groups:write` — required for **Create conversation** (private channels) and **Invite to conversation**

Add these scopes under **Bot Token Scopes** in your Slack app configuration if you need these actions.
::::
