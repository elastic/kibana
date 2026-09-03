---
navigation_title: "Mattermost"
type: reference
description: "Use the Mattermost connector to browse teams and channels, search conversations, find users, and post messages."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Mattermost connector [mattermost-action-type]

The Mattermost connector connects directly to the Mattermost REST API v4. It lets workflows and agents browse the teams and channels visible to a bot, retrieve and search posts, and resolve users. Workflows can also create direct-message channels and post messages or thread replies.

## Create connectors in {{kib}} [define-mattermost-ui]

You can create a Mattermost connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [mattermost-connector-configuration]

Mattermost server URL
:   The Site URL of your Mattermost server, for example `https://mattermost.example.com` or `https://example.com/company/mattermost` for a deployment under a subpath. Do not include `/api/v4`. HTTP is supported for self-hosted development environments, but HTTPS is recommended for production.

Bot access token
:   A bearer token for a Mattermost bot account. Add the bot to every team and channel that the connector needs to access. Grant `create_post` for **Create post**, `create_direct_channel` for **Create direct channel**, and `upload_file` when **Create post** attaches existing `fileIds`.

## Test connectors [mattermost-action-configuration]

You can test the connector while creating or editing it in {{kib}}. The test calls `GET /api/v4/users/me` and returns the authenticated bot identity.

## Connector actions [mattermost-connector-actions]

The Mattermost connector has the following actions:

**List teams**
:   Lists the teams that the authenticated bot belongs to. It resolves the bot's current user ID before requesting the teams.

**List channels**
:   Lists channels in a team that the authenticated bot can access.
    - `teamId` (required): A team ID returned by **List teams**.

**Find user by email**
:   Finds one visible Mattermost user by exact email address. Email visibility depends on the server's privacy settings.
    - `email` (required): The exact email address to find.

**Create direct channel**
:   Creates or returns a direct-message channel between the authenticated bot and one other user. The bot requires `create_direct_channel`. This is a workflow-only write action.
    - `userId` (required): The other user's ID, for example an ID returned by **Find user by email**.

**Create post**
:   Creates a channel post or thread reply. The bot requires `create_post`. This is a workflow-only write action.
    - `channelId` (required): The destination channel ID.
    - `message` (required): The post body in Mattermost Markdown, up to 16,383 characters.
    - `rootId` (optional): The root post ID when creating a thread reply.
    - `fileIds` (optional): Up to ten IDs for files that are already uploaded to Mattermost. Attaching them requires `upload_file`. File upload is not included in this connector.
    - `props` (optional): A JSON property bag with at most 50 keys and a maximum serialized length of 20,000 characters. Functions, `undefined`, non-finite numbers, big integers, cycles, and other non-JSON values are rejected.
    - `priority` (optional): Root posts only, and available only when Mattermost `PostPriority` is enabled. The object has `priority` set to `important` or `urgent`, and optional `requestedAck`. Omit it for standard priority and whenever `rootId` creates a thread reply. `requestedAck` also requires an eligible Mattermost Professional or Enterprise plan.

**List posts**
:   Lists a selected, ordered page of posts in a channel.
    - `channelId` (required): The channel ID.
    - `page` (optional): Zero-based page number, up to 10,000.
    - `perPage` (optional): Number of posts to return, from 1 to 200. Defaults to 60 outside cursor and `since` modes.
    - `before` or `after` (optional): A post ID cursor. These fields are mutually exclusive. Paging fields are sent with a cursor only when explicitly provided.
    - `since` (optional): Unix time in milliseconds. Returns posts modified after that time, with a Mattermost server limit of 1,000. `since` cannot be combined with paging fields or post cursors.

**Get thread**
:   Gets a bounded page of a post thread.
    - `postId` (required): The ID of the root post or any reply in the thread.
    - `perPage` (optional): Number of posts to return, from 1 to 200. Defaults to 60.
    - `fromPost` and `fromCreateAt` (optional): A post ID cursor and that post's Unix creation timestamp in milliseconds. `fromCreateAt` is required when `fromPost` is set.
    - `direction` (optional): Returns posts in the `up` or `down` direction. It can be set independently of the cursor fields and defaults to `down`.

    Thread responses normally contain empty `nextPostId` and `previousPostId` values. When `hasNext` is `true`, continue with the last returned reply's `id` as `fromPost` and its `createAt` as `fromCreateAt`. An empty successful response can include `firstInaccessiblePostTime` when earlier thread content is inaccessible.

**Search posts**
:   Searches posts visible to the bot within a team. Search terms support Mattermost modifiers such as `from:username` and `in:channel-name`.
    - `teamId` (required): The team ID to search.
    - `terms` (required): Search terms, up to 2,000 characters.
    - `isOrSearch` (optional): Uses OR search semantics when `true`; defaults to `false` for AND semantics.
    - `page` (optional): Zero-based results page, up to 10,000. Defaults to 0.
    - `perPage` (optional): Number of posts to return, from 1 to 200. Defaults to 60.

    Search pagination only takes effect when Elasticsearch search is configured on the Mattermost server.

## Connector networking configuration [mattermost-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all connectors or use `xpack.actions.customHostSettings` for the Mattermost host. If you use `xpack.actions.allowedHosts`, add the Mattermost server host to the list.

## Get API credentials [mattermost-api-credentials]

Ask a Mattermost system administrator to create a bot account and its access token, then add the bot to the teams and channels required by your workflows. Use a least-privilege Mattermost role. Grant `create_direct_channel` only when **Create direct channel** is needed, `create_post` only when **Create post** is needed, and `upload_file` when **Create post** attaches existing `fileIds`. To send priority metadata, the administrator must also enable `PostPriority`. Using `requestedAck` additionally requires an eligible Mattermost Professional or Enterprise plan.

Store the token in the connector's **Bot access token** field. {{kib}} sends it in the `Authorization: Bearer` header and stores it as a secret.
