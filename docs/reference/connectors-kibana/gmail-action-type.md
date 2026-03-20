---
navigation_title: "Gmail"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/gmail-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Gmail connector [gmail-action-type]

The Gmail connector enables searching and reading emails from Gmail via the Gmail API.

## Create connectors in {{kib}} [define-gmail-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [gmail-connector-configuration]

Gmail connectors use the following configuration:

Bearer Token
:   A Google OAuth 2.0 access token with Gmail API scopes. See [Get API credentials](#gmail-api-credentials) for instructions.

## Test connectors [gmail-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's profile from the Gmail API.

The Gmail connector has the following actions:

Search messages
:   Search for messages using Gmail search syntax.
    - **query** (optional): Gmail search query (e.g. `from:user@example.com`, `is:unread`, `subject:report`, `after:2024/01/01`, `has:attachment`).
    - **maxResults** (optional): Maximum number of messages to return (1–100). Defaults to 50.
    - **pageToken** (optional): Pagination token from a previous response.

Get message
:   Retrieve a single message by ID with full headers and body.
    - **messageId** (required): The ID of the message to retrieve.
    - **format** (optional): `minimal` (headers only), `full` (default), or `raw` (RFC 2822).

List messages
:   List messages, optionally filtered by label.
    - **maxResults** (optional): Maximum number of messages to return (1–100). Defaults to 50.
    - **pageToken** (optional): Pagination token from a previous response.
    - **labelIds** (optional): Array of label IDs (e.g. INBOX, SENT).

## Get API credentials [gmail-api-credentials]

To use the Gmail connector, you need a Google OAuth 2.0 access token with Gmail API scopes. You can obtain one using the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):

1. Open the OAuth 2.0 Playground and ensure **Use your own OAuth credentials** is checked if you have a project.
2. In **Step 1 - Select & authorize APIs**, select the Gmail API v1 scope: `https://www.googleapis.com/auth/gmail.readonly` (or `https://www.googleapis.com/auth/gmail.metadata` for metadata only; use `https://mail.google.com/` for full access).
3. Click **Authorize APIs** and sign in with your Google account.
4. In **Step 2 - Exchange authorization code for tokens**, click **Exchange authorization code for tokens**.
5. Copy the **Access token** and use it as the Bearer token when creating or activating the Gmail data source in Kibana.

The token expires after a short time (e.g. one hour). For long-lived access, use a refresh token flow or re-authorize as needed.
