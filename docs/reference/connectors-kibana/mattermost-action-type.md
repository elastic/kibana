---
navigation_title: "Mattermost"
type: reference
description: "Use the Mattermost connector to manage channels, users, posts, threads, reactions, and memberships."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Mattermost connector [mattermost-action-type]

The Mattermost connector calls the Mattermost REST API v4. Its initial registration exposes read
actions to Agent Builder. State-changing actions are defined as workflow-only, but they are not
available until a follow-up PR adds the `workflows` feature after the connector reaches every
Production-NonCanary version.

The connector defines 22 actions. Its 11 read actions are available to Agent Builder in the initial
registration. The 11 state-changing actions become available after the `workflows` feature
follow-up. **Create user** is not available because email-auth user creation requires a password,
while Workflow action inputs and execution records do not provide protected per-run secret storage
or redaction. If this action is enabled in the future, its password must come only from protected
Workflow secret material and must never be hardcoded in workflow YAML.

## Create connectors in {{kib}} [define-mattermost-ui]

You can create a Mattermost connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [mattermost-connector-configuration]

Mattermost server URL
:   The Site URL of your Mattermost server, for example `https://mattermost.example.com` or
    `https://example.com/company/mattermost` for a deployment under a subpath. Do not include
    `/api/v4`. HTTP is supported for self-hosted development environments, but HTTPS is recommended
    for production.

Bot access token
:   A bearer token for a Mattermost bot account. Add the bot to every team and channel that it must
    access and grant only the permissions required by the enabled actions. Reads can require
    `read_channel`, `read_channel_content`, `list_team_channels`, `view_members`, and `view_team`.
    Depending on enabled actions, grant `create_post`, `create_direct_channel`, `upload_file`,
    `create_public_channel`, `create_private_channel`, `join_public_channels`,
    `manage_public_channel_members`, `manage_private_channel_members`, `delete_public_channel`,
    `delete_private_channel`, `manage_team`, `sysconsole_write_user_management_channels`,
    `delete_post`, `delete_others_posts`, `add_reaction`, `remove_reaction`, `edit_other_users`, or
    `manage_system`. **Create ephemeral post** requires `create_post_ephemeral`, currently
    system-admin-only.

## Test connectors [mattermost-action-configuration]

You can test the connector while creating or editing it in {{kib}}. The test calls
`GET /api/v4/users/me` and returns the authenticated bot identity.

## Connector actions [mattermost-connector-actions]

The Mattermost connector has the following actions.

### Team and channel discovery [mattermost-discovery-actions]

**List teams** (`listTeams`)
:   Lists teams that the authenticated connector user belongs to.

**List channels** (`listChannels`)
:   Lists channels in a team that the authenticated connector user can access.
    - `teamId` (required): A team ID returned by **List teams**.

**Search channels** (`searchChannels`)
:   Searches visible channels within one team. This read action uses a POST endpoint. With
    `list_team_channels`, results can include all public channels in the team. Otherwise, a team
    member receives only joined channels.
    - `teamId` (required): The team ID to search.
    - `term` (required): A channel name or display-name term, up to 200 characters.

**Get channel stats** (`getChannelStats`)
:   Returns validated member, guest, pinned-post, and file counts. Requires `read_channel`.
    - `channelId` (required): The channel ID.

### Channel administration [mattermost-channel-administration-actions]

The state-changing actions in this section are workflow-only. **List channel members** is a read
action available to Agent Builder tools. Confirm the target before running a state-changing action.

**Add user to channel** (`addUserToChannel`)
:   Adds one user to a public or private channel. Adding yourself to a public channel requires
    `join_public_channels`. Adding another user requires `manage_public_channel_members`, or
    `manage_private_channel_members` for a private channel. Direct and group message channels are
    rejected. Group-constrained channels reject users outside the linked group.
    - `channelId` (required): The public or private channel ID.
    - `userId` (required): The user ID to add.
    - `postRootId` (optional): A valid root post in the same channel.

**Create channel** (`createChannel`)
:   Creates a public or private channel. Requires `create_public_channel` or
    `create_private_channel`. Board and Space channel types are not supported.
    - `teamId` (required): The target team ID.
    - `name` (required): A unique lowercase name, up to 64 letters, numbers, hyphens, or underscores.
    - `displayName` (required): A display name, up to 64 Unicode code points.
    - `type` (required): `O` for public or `P` for private.
    - `purpose` (optional): A purpose, up to 250 Unicode code points.
    - `header` (optional): A header, up to 1,024 Unicode code points.

**Delete channel** (`deleteChannel`)
:   Archives a channel with soft deletion. It never requests permanent deletion. Public channels
    require `delete_public_channel`; private channels require `delete_private_channel`.
    `manage_system` also qualifies. Direct and group message channels cannot be archived.
    - `channelId` (required): The public or private channel ID.

**List channel members** (`listChannelMembers`)
:   Lists a bounded page of channel members. Requires `read_channel`. Mattermost can omit another
    user's private last-viewed and last-update timestamps.
    - `channelId` (required): The channel ID.
    - `page` (optional): A zero-based page, up to 10,000. Defaults to 0.
    - `perPage` (optional): From 1 to 200 members. Defaults to 60.

**Restore channel** (`restoreChannel`)
:   Restores an archived channel. The documented REST permission is `manage_team`; current servers
    can also allow `sysconsole_write_user_management_channels`.
    - `channelId` (required): The archived channel ID.

### User actions [mattermost-user-actions]

**Find user by email** (`findUserByEmail`)
:   Finds one visible user by exact email address. Email visibility depends on server privacy
    settings.
    - `email` (required): The exact email address.

**Get user by ID** (`getUserById`)
:   Returns selected, non-secret profile fields. Requires an active session and permission to see
    the user. Visibility can depend on `view_members` and shared team or channel context.
    - `userId` (required): The user ID.

**Deactivate user** (`deactivateUser`)
:   Archives a user and revokes their sessions. It never requests permanent deletion. The caller
    must be that user or have `edit_other_users`. Deactivating a system administrator also requires
    `manage_system`. Self-deactivation can be disabled unless the caller has `manage_system`.
    - `userId` (required): The user ID to deactivate.

### Message actions [mattermost-message-actions]

**Create direct channel** (`createDirectChannel`)
:   Creates or returns a direct-message channel between the authenticated connector user and one
    other user. Requires `create_direct_channel`.
    - `userId` (required): The other user's ID.

**Create post** (`createPost`)
:   Creates a channel post or thread reply. Requires `create_post`.
    - `channelId` (required): The destination channel ID.
    - `message` (required): Mattermost Markdown, up to 16,383 Unicode code points.
    - `rootId` (optional): The root post ID for a thread reply.
    - `fileIds` (optional): Up to five IDs for existing Mattermost files. Requires `upload_file`.
      Binary upload is not included.
    - `props` (optional): JSON with at most 50 keys and a serialized limit of 20,000 characters.
    - `priority` (optional): `important` or `urgent` metadata for a root post. It requires
      `PostPriority`; `requestedAck` also requires an eligible Professional or Enterprise plan.
      Omit priority whenever `rootId` is present.

**Delete post** (`deletePost`)
:   Soft-deletes a post and never requests permanent deletion. Deleting your own post requires
    `delete_post`; deleting another user's post requires `delete_others_posts`.
    - `postId` (required): The post ID.

**Create ephemeral post** (`createEphemeralPost`)
:   Sends a transient WebSocket-delivered post to one user. It is not persisted or queryable.
    Requires `create_post_ephemeral`, which current Mattermost servers grant only to system
    administrators.
    - `userId` (required): The target user ID.
    - `channelId` (required): The channel where the post appears.
    - `message` (required): Mattermost Markdown, up to 16,383 Unicode code points.

**List posts** (`listPosts`)
:   Lists selected posts in API order.
    - `channelId` (required): The channel ID.
    - `page` (optional): A zero-based page, up to 10,000.
    - `perPage` (optional): From 1 to 200 posts. Defaults to 60 outside cursor and `since` modes.
    - `before` or `after` (optional): Mutually exclusive post ID cursors.
    - `since` (optional): Unix milliseconds. It cannot be combined with paging fields or cursors
      and can return up to 1,000 modified posts.

**Get thread** (`getThread`)
:   Gets a bounded page of a post thread.
    - `postId` (required): A root post or reply ID.
    - `perPage` (optional): From 1 to 200 posts. Defaults to 60.
    - `fromPost` and `fromCreateAt` (optional): A post cursor and its Unix creation timestamp.
    - `direction` (optional): `up` or `down`. Defaults to `down`.

    When `hasNext` is `true`, continue with the last returned reply's `id` and `createAt` rather
    than the normally empty next and previous pointer fields.

**Search posts** (`searchPosts`)
:   Searches visible posts within a team. Requires `view_team`. Terms support modifiers such as
    `from:username` and `in:channel-name`. Search paging requires Mattermost Elasticsearch search.
    - `teamId` (required): The team ID.
    - `terms` (required): Search terms, up to 2,000 characters.
    - `isOrSearch` (optional): OR semantics when `true`; defaults to AND.
    - `page` (optional): A zero-based page, up to 10,000. Defaults to 0.
    - `perPage` (optional): From 1 to 200 posts. Defaults to 60.

### Reaction actions [mattermost-reaction-actions]

**Create reaction** (`createReaction`)
:   Adds a reaction as the authenticated connector user. The connector resolves the user ID
    internally because Mattermost forbids reaction impersonation. Requires `add_reaction`.
    - `postId` (required): The post ID.
    - `emojiName` (required): An emoji name without colons, up to 64 permitted characters.

**Delete reaction** (`deleteReaction`)
:   Removes only the authenticated connector user's reaction. Requires `remove_reaction`.
    - `postId` (required): The post ID.
    - `emojiName` (required): The emoji name without colons.

**List reactions** (`listReactions`)
:   Lists selected fields for reactions on a post. Requires permission to read the post and channel
    content.
    - `postId` (required): The post ID.

## Connector networking configuration [mattermost-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings)
to configure proxies, certificates, or TLS. If you use `xpack.actions.allowedHosts`, add the
Mattermost host.

## Get API credentials [mattermost-api-credentials]

Ask a Mattermost system administrator to create a bot account and access token. Add it to the
required teams and channels and use a least-privilege role. Reads can require `read_channel`,
`read_channel_content`, `list_team_channels`, `view_members`, and `view_team`. Depending on enabled
actions, grant `create_post`, `create_direct_channel`, `upload_file`, `create_public_channel`,
`create_private_channel`, `join_public_channels`, `manage_public_channel_members`,
`manage_private_channel_members`, `delete_public_channel`, `delete_private_channel`, `manage_team`,
`sysconsole_write_user_management_channels`, `delete_post`, `delete_others_posts`, `add_reaction`,
`remove_reaction`, `edit_other_users`, or `manage_system`. **Create ephemeral post** requires
`create_post_ephemeral`, currently system-admin-only.

Store the token in **Bot access token**. {{kib}} sends it in the `Authorization: Bearer` header and
stores it as a connector secret. Do not place new-user passwords or other per-run credentials in
workflow action inputs.
