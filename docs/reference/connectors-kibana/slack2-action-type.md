---
navigation_title: "Slack"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/slack-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# Slack connector [slack-action-type]

The Slack connector uses OAuth 2.0 Authorization Code flow to communicate with the Slack API, enabling you to search message history and send messages to Slack channels.

## Create connectors in {{kib}} [define-slack-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [slack-connector-configuration]

Slack connectors have the following configuration properties:

Client ID
:   The client ID for your Slack app, obtained from your Slack app settings.

Client Secret
:   The client secret for your Slack app. This is a sensitive value that should be kept secure.


Redirect URI
:   (Optional) The callback URL for OAuth authorization. If not specified, Kibana's default OAuth callback URL is used.


## Test connectors [slack-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Slack connector has the following actions:

Search Messages
:   Search for messages across your Slack workspace.
- **query** (required): The search query to find messages.
- **sort** (optional): Sort order for results. Either `score` (relevance) or `timestamp`.
- **sortDir** (optional): Sort direction. Either `asc` or `desc`.
- **count** (optional): Number of results to return (1-100).
- **page** (optional): Page number for pagination.

Send Message
:   Send a message to a Slack channel.
- **channel** (required): The channel ID, user ID, or conversation ID to send the message to.
- **text** (required): The message text to send.
- **threadTs** (optional): Timestamp of another message to reply to, creating a threaded reply.
- **unfurlLinks** (optional): Whether to enable unfurling of text-based content.
- **unfurlMedia** (optional): Whether to enable unfurling of media content.


## Get API credentials [slack-api-credentials]

To use the Slack connector, you need to create a Slack app and configure OAuth:

1. Go to the [Slack API Apps page](https://api.slack.com/apps) and click **Create New App**.

2. Choose **From scratch**, enter an app name, and select the workspace where you want to install the app.

3. In the app settings, navigate to **OAuth & Permissions**.

4. Under **Redirect URLs**, add your Kibana OAuth callback URL. This is typically `https://<your-kibana-url>/api/actions/connector/_oauth_callback`.

5. Under **Scopes**, add the following **User Token Scopes**:
  - `search:read` - Required for searching messages
  - `chat:write` - Required for sending messages

6. Navigate to **Basic Information** to find your **Client ID** and **Client Secret**.

7. In Kibana, create a new Slack connector and enter the Client ID and Client Secret.

8. Click **Authorize** to complete the OAuth flow. You will be redirected to Slack to authorize the app, then back to Kibana.

::::{note}
The `search:read` scope requires a user token, not a bot token. This means searches are performed in the context of the authorizing user and will only return messages that user has access to.
::::
