---
navigation_title: "Slack (v2)"
type: reference
description: "Use the Slack (v2) connector to search messages, resolve channel IDs, send messages, create channels, and invite users to Slack channels using the Slack Web API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Slack (v2) connector [slack-v2-action-type]

The Slack (v2) connector enables workflow-driven Slack automation: search Slack messages, resolve public channel IDs, send messages, create channels, and invite users to Slack channels using the Slack Web API. It authenticates using OAuth Authorization Code (Slack OAuth v2).

## Create connectors in {{kib}} [define-slack-v2-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [slack-v2-connector-configuration]

Slack (v2) connectors use OAuth Authorization Code authentication. When creating the connector, you will be prompted to authorize access to your Slack workspace. No additional configuration properties are required beyond the OAuth credentials.

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

Resolve channel ID
:   Resolve a Slack conversation ID (`C...` for public channels, `G...` for private channels) from a human channel name (for example, `#general`).
    - `name` (required): Channel name (with or without `#`).
    - `types` (optional): Conversation types to search. Defaults to `public_channel`.
    - `match` (optional): `exact` (default) or `contains`.
    - `excludeArchived` (optional): Exclude archived channels. Defaults to `true`.
    - `cursor` (optional): Pagination cursor to resume a previous scan.
    - `limit` (optional): Channels per page (1 to 1000). Defaults to `1000`.
    - `maxPages` (optional): Maximum pages to scan before giving up. Defaults to `10`.

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
    - `channel` (required): Conversation ID (for example, `C123...`). Use **Resolve channel ID** first if you only have a channel name.
    - `text` (required): Message text.
    - `threadTs` (optional): Reply in a thread (timestamp of the parent message).
    - `unfurlLinks` (optional): Turn on unfurling of primarily text-based content.
    - `unfurlMedia` (optional): Turn on unfurling of media content.

## Connector networking configuration [slack-v2-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), include `slack.com` in the list.

## Get API credentials [slack-v2-api-credentials]

To use the Slack (v2) connector, you need a Slack app configured for OAuth.

1. Go to [Slack API: Your Apps](https://api.slack.com/apps) and select **Create New App**.
2. Choose **From scratch**, give it a name (for example, "Kibana Slack Connector"), and select your workspace.
3. Under **OAuth & Permissions**, add the following **User Token Scopes**:
   - `channels:read` — resolve public channel IDs
   - `chat:write` — send messages
   - `files:read` — access shared files
   - `groups:read` — list private channels
   - `im:read` — list direct messages
   - `mpim:read` — list group direct messages
   - `search:read.files` — search files
   - `search:read.im` — search direct messages
   - `search:read.mpim` — search group direct messages
   - `search:read.private` — search private channels
   - `search:read.public` — search public channels
   - `users:read` — look up user information
4. Set the **Redirect URL** to your Kibana OAuth redirect URI.
5. Under **Basic Information**, copy the **Client ID** and **Client Secret**.
6. In {{kib}}, enter the Client ID and Client Secret when creating the Slack (v2) connector. You will be redirected to Slack to authorize access to your workspace.

::::{note}
Additional scopes may be required for certain actions. For example, `groups:write` is needed to create private channels or invite users. Add scopes as needed under **User Token Scopes** in your Slack app configuration.
::::
