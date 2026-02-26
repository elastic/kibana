---
navigation_title: "Slack (v2)"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/slack-v2-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Slack (v2) connector [slack-v2-action-type]

The Slack (v2) connector enables workflow-driven Slack automation: search Slack messages, resolve public channel IDs, and send messages to Slack public channels using the Slack Web API.

## Create connectors in {{kib}} [define-slack-v2-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [slack-v2-connector-configuration]

Slack (v2) connectors have the following configuration properties:

Temporary Slack user token
:   A Slack **user token** (for example, `xoxp-...`). This is a **temporary** MVP authentication method. Treat it as sensitive and rotate it if exposed.

## Test connectors [slack-v2-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by calling Slack `auth.test`.

The Slack (v2) connector has the following actions:

Search messages
:   Search for messages in Slack.
    - **query** (required): Slack search query string.
    - **inChannel** (optional): Adds `in:<channel_name>` to the query.
    - **fromUser** (optional): Adds `from:<@UserID>` or `from:username` to the query.
    - **after** (optional): Adds `after:<date>` to the query (for example, `2026-02-10`).
    - **before** (optional): Adds `before:<date>` to the query (for example, `2026-02-10`).
    - **sort** (optional): Sort order, `score` or `timestamp`.
    - **sortDir** (optional): Sort direction, `asc` or `desc`.
    - **count** (optional): Results to return (1-20). Slack returns up to 20 results per page.
    - **cursor** (optional): Pagination cursor (use `response_metadata.next_cursor` from a previous call).
    - **includeContextMessages** (optional): Include contextual messages. Defaults to `true`.
    - **includeBots** (optional): Include bot messages. Defaults to `false`.
    - **includeMessageBlocks** (optional): Include Block Kit blocks. Defaults to `true`.
    - **raw** (optional): If `true`, return the full raw Slack response (verbose).

Resolve channel ID
:   Resolve a Slack conversation ID (`C...` for public channels, `G...` for private channels) from a human channel name (for example, `#general`).
    - **name** (required): Channel name (with or without `#`).
    - **types** (optional): Conversation types to search. Defaults to `public_channel`.
    - **match** (optional): `exact` (default) or `contains`.
    - **excludeArchived** (optional): Exclude archived channels. Defaults to `true`.
    - **cursor** (optional): Pagination cursor to resume a previous scan.
    - **limit** (optional): Channels per page (1-1000). Defaults to `1000`.
    - **maxPages** (optional): Max pages to scan before giving up. Defaults to `10`.

Send message
:   Send a message to a Slack conversation ID.
    - **channel** (required): Conversation ID (for example, `C123...`). Use **Resolve channel ID** first if you only have a channel name.
    - **text** (required): Message text.
    - **threadTs** (optional): Reply in a thread (timestamp of the parent message).
    - **unfurlLinks** (optional): Enable unfurling of primarily text-based content.
    - **unfurlMedia** (optional): Enable unfurling of media content.

## Connector networking configuration [slack-v2-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. If you use [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings), make sure `slack.com` is included.

## Get API credentials [slack-v2-api-credentials]

To use the Slack (v2) connector, you need a Slack app and a Slack **user token**.

1. Create a Slack app and install it to your workspace.
2. Add **User Token Scopes** for the actions you intend to use:
   - **resolve channel ID**: `channels:read`
   - **send message (public channels)**: `chat:write`
   - **search messages**: `search:read.public`, `search:read.private`, `search:read.im`, `search:read.mpim`, `search:read.files`
3. Copy the **User OAuth Token** (for example, `xoxp-...`) and paste it into the connector configuration.

