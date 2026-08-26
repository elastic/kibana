---
navigation_title: "Gmail"
type: reference
description: "Use the Gmail connector to search, read, label, and send emails in Gmail."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Gmail connector [gmail-action-type]

The Gmail connector connects to the Gmail API and enables search, read, label, quarantine, and send operations on Gmail mailboxes.

## Create connectors in {{kib}} [define-gmail-ui]

You can create a Gmail connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding a Gmail data source.

### Connector configuration [gmail-connector-configuration]

Gmail connectors support the following authentication types:

Elastic-managed authentication (recommended, read-only)
:   Uses Elastic's managed Google OAuth integration. Grants `gmail.readonly` access only. **Write actions are not available** with this authentication type.

OAuth 2.0 authorization code (required for write actions)
:   Uses your own Google OAuth 2.0 app. Grants `gmail.modify` access, which covers reads, label changes, trash, and send. Required for `modifyLabels`, `trashMessage`, `untrashMessage`, `sendMessage`, `replyMessage`, `markAsRead`, and `markAsUnread`. See [Get API credentials](#gmail-api-credentials) for setup instructions.

## Test connectors [gmail-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's profile from the Gmail API.

## Available actions [gmail-available-actions]

### Read

#### Search messages

Search for messages using Gmail search syntax.

`query`
:   (Optional) Gmail search query using operators such as `from:`, `to:`, `subject:`, `is:unread`, `after:YYYY/MM/DD`, `newer_than:Nd`. Prefer narrow queries to keep responses small.

`maxResults`
:   (Optional) Number of message IDs to return. Default 10, capped at 100.

`pageToken`
:   (Optional) Pagination cursor from a previous response.

#### List messages

List message IDs, optionally filtered by label.

`maxResults`
:   (Optional) Number of message IDs to return. Default 10, capped at 100.

`pageToken`
:   (Optional) Pagination cursor from a previous response.

`labelIds`
:   (Optional) Filter by label IDs, for example `["INBOX"]` or `["SENT"]`.

#### Get message

Retrieve a single message by ID.

`messageId`
:   (Required) Gmail message ID from `searchMessages` or `listMessages`.

`format`
:   (Optional) `minimal` for headers only (default), `full` for body and attachment metadata, `raw` for RFC 2822 format.

#### Get attachment

Retrieve an attachment by message ID and attachment ID. Call `getMessage` with `format: "full"` first to get attachment IDs from `payload.parts[].body.attachmentId`.

`messageId`
:   (Required) Gmail message ID.

`attachmentId`
:   (Required) Attachment ID from the message's `payload.parts[].body.attachmentId`.

### Labels and read state

#### List labels

List all Gmail labels (system and user-created) with their IDs and names. Call this before `modifyLabels` to resolve a label name (for example, "Quarantine") to its ID.

#### Mark as read

Remove the `UNREAD` label from a message. Reversible with `markAsUnread`. Requires OAuth 2.0 authorization code auth.

`messageId`
:   (Required) Gmail message ID.

#### Mark as unread

Add the `UNREAD` label to a message. Reversible with `markAsRead`. Requires OAuth 2.0 authorization code auth.

`messageId`
:   (Required) Gmail message ID.

#### Modify labels

Add or remove labels on a message. The quarantine primitive: pass the quarantine label ID in `addLabelIds` and `["INBOX"]` in `removeLabelIds` to move a message out of the inbox. Requires OAuth 2.0 authorization code auth.

`messageId`
:   (Required) Gmail message ID.

`addLabelIds`
:   (Optional) Label IDs to add. Call `listLabels` to resolve a name to an ID.

`removeLabelIds`
:   (Optional) Label IDs to remove. At least one of `addLabelIds` or `removeLabelIds` is required.

### Quarantine and rollback

#### Trash message

Move a message to Trash. Reversible with `untrashMessage` within 30 days. Requires OAuth 2.0 authorization code auth.

`messageId`
:   (Required) Gmail message ID.

#### Untrash message

Restore a message from Trash. Rolls back a `trashMessage` call. Only effective within 30 days of trashing. Requires OAuth 2.0 authorization code auth.

`messageId`
:   (Required) Gmail message ID.

### Compose

#### Send message

Send an email from the authenticated user's Gmail account. Irreversible once accepted by the receiving mail server. Supports plain-text and HTML bodies, bare addr-spec recipients only, and no attachments in v1. Available in Workflows only. Requires OAuth 2.0 authorization code auth.

`to`
:   (Required) Recipient email addresses (bare addr-spec, for example `["user@example.com"]`).

`subject`
:   (Required) Email subject line.

`body`
:   (Required) Email body content.

`bodyType`
:   (Optional) `"text"` (default) or `"html"`.

`cc`
:   (Optional) CC recipient addresses.

`bcc`
:   (Optional) BCC recipient addresses.

#### Reply message

Send a reply to an existing message, preserving the thread. The connector fetches the original message to set threading headers and determine the default recipient from `Reply-To` or `From`. Available in Workflows only. Requires OAuth 2.0 authorization code auth.

`messageId`
:   (Required) Gmail message ID to reply to.

`body`
:   (Required) Reply body content.

`bodyType`
:   (Optional) `"text"` (default) or `"html"`.

`subject`
:   (Optional) Override the reply subject. Defaults to `Re: <original subject>`.

`to`
:   (Optional) Override recipient addresses. Defaults to the `Reply-To` or `From` address of the original message.

## Limitations [gmail-limitations]

- **Write actions require OAuth 2.0 authorization code auth.** Elastic-managed authentication is limited to `gmail.readonly`. The `modifyLabels`, `trashMessage`, `untrashMessage`, `sendMessage`, `replyMessage`, `markAsRead`, and `markAsUnread` actions are not available with Elastic-managed authentication.
- **Existing connectors must be re-authorized.** Google does not re-prompt for consent when the requested scope changes. If you created a Gmail connector before write action support was added, edit the connector and re-authorize it so Google issues a token that includes `gmail.modify`.
- **Permanent deletion is not supported.** Use `trashMessage` (reversible with `untrashMessage`). Gmail permanently removes trashed mail after 30 days.
- **No attachments in `sendMessage` v1.** Attachment support is planned for a future release.

## Connector networking configuration [gmail-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [gmail-api-credentials]

To use write actions, create a Google OAuth 2.0 app and authorize it with the `gmail.modify` scope:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable the **Gmail API** for the project.
3. Under **APIs & Services → Credentials**, create an OAuth 2.0 client ID of type **Web application**. Add your Kibana instance URL as an authorized redirect URI.
4. Note the **Client ID** and **Client Secret**.
5. When creating the Gmail connector in Kibana, select **OAuth 2.0 authorization code**, enter the client ID and secret, and authorize the connector. Google will prompt you to grant `gmail.modify` access.

::::{note}
The `gmail.modify` scope covers reading, labeling, trashing, and sending email. Permanent deletion of messages is not available without the broader `https://mail.google.com/` scope, which is not requested by this connector.
::::
