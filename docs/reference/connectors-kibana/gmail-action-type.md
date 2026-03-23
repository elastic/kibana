---
navigation_title: "Gmail"
type: reference
description: "Use the Gmail connector to search and read emails from Gmail."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Gmail connector [gmail-action-type]

The Gmail connector connects to the Gmail API and enables federated search of email. You configure a Bearer token (Google OAuth 2.0 access token) when creating the connector.

## Create connectors in {{kib}} [define-gmail-ui]

You can create a Gmail connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding a Gmail data source.

### Connector configuration [gmail-connector-configuration]

Gmail connectors use the following configuration:

Bearer Token
:   A Google OAuth 2.0 access token with Gmail API scopes. See [Get API credentials](#gmail-api-credentials) for instructions.

## Test connectors [gmail-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's profile from the Gmail API.

## Available actions [gmail-available-actions]

| Action | Description |
|--------|-------------|
| Search messages | Search for messages using Gmail search syntax. Parameters: `query` (optional), `maxResults` (optional, default 10, max 100), `pageToken` (optional). |
| List messages | List message IDs, optionally filtered by label. Parameters: `maxResults` (optional, default 10, max 100), `pageToken` (optional), `labelIds` (optional, for example: INBOX, SENT). |
| Get message | Retrieve a single message by ID. Parameters: `messageId` (required), `format` (optional: `minimal` for headers only, `full` for body and attachment metadata, `raw` for RFC 2822; default `minimal`). Use `full` to get attachment IDs in `payload.parts[].body.attachmentId`. |
| Get attachment | Retrieve one attachment's content by message ID and attachment ID. Parameters: `messageId` (required), `attachmentId` (required). Get attachment IDs from get message with format `full`. Returns `data` (base64url-encoded content). |

**Search messages** supports Gmail search operators such as `from:`, `to:`, `subject:`, `is:unread`, `is:read`, `after:YYYY/MM/DD`, `newer_than:Nd`, and `has:attachment`. Prefer narrow queries to keep responses small.

**Attachments:** Call get message with format `full` to receive `payload.parts` with `body.attachmentId` and `filename` for each attachment. Then call get attachment with that message ID and attachment ID to fetch the attachment content (base64url-encoded).

## Connector networking configuration [gmail-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [gmail-api-credentials]

To use the Gmail connector, you need a Google OAuth 2.0 access token with Gmail API scopes. You can obtain one using the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):

1. Open the OAuth 2.0 Playground and ensure **Use your own OAuth credentials** is checked if you have a project.
2. In **Step 1 - Select & authorize APIs**, select the Gmail API v1 scope: `https://www.googleapis.com/auth/gmail.readonly` (or `https://www.googleapis.com/auth/gmail.metadata` for metadata only; use `https://mail.google.com/` for full access).
3. Click **Authorize APIs** and sign in with your Google account.
4. In **Step 2 - Exchange authorization code for tokens**, click **Exchange authorization code for tokens**.
5. Copy the **Access token** and use it as the Bearer token when creating or activating the Gmail data source in Kibana.

::::{note}
OAuth 2.0 Playground tokens expire after a short time (for example, one hour). For long-lived access, use a refresh token flow or re-authorize as needed. Refer to the [Google Identity documentation](https://developers.google.com/identity/protocols/oauth2) for details.
::::
