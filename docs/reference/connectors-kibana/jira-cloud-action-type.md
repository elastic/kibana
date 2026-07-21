---
navigation_title: "Jira Cloud"
type: reference
description: "Use the Jira Cloud connector to search issues with JQL, retrieve issue and project details, and look up users from your Jira Cloud site."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Jira Cloud connector [jira-cloud-action-type]

The Jira Cloud connector connects to the official [Atlassian remote MCP server](https://developer.atlassian.com/cloud/jira/platform/mcp/) to search issues, retrieve project and issue details, and look up users. It uses OAuth 2.0 Authorization Code flow (Atlassian OAuth) for authentication.

## Create connectors in {{kib}} [define-jira-cloud-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [jira-cloud-connector-configuration]

Jira Cloud connectors have the following configuration properties:

Authentication type
:   OAuth 2.0 Authorization Code flow. Refer to [Set up OAuth authentication](#jira-cloud-oauth-setup) for setup instructions.

Client ID
:   The client ID from your Atlassian OAuth 2.0 app.

Client secret
:   The client secret from your Atlassian OAuth 2.0 app.

## Test connectors [jira-cloud-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

## Actions [jira-cloud-actions]

The Jira Cloud connector provides the following actions:

Search issues with JQL
:   Search or filter Jira issues using JQL (Jira Query Language).
    - `jql` (required): A JQL query string (for example, `project = PROJ AND status = "In Progress"`).
    - `maxResults` (optional): Maximum number of issues to return.
    - `nextPageToken` (optional): Pagination token from a previous response.

Get issue
:   Fetch full details of a single Jira issue by its key or ID (for example, `PROJ-123`). Returns all issue fields including summary, description, status, priority, assignee, comments, and metadata.

Get projects
:   List or search Jira projects accessible to the authenticated user.
    - `query` (optional): Search term to filter projects by name or key.
    - `maxResults` (optional): Maximum number of projects to return.
    - `startAt` (optional): Zero-based index for pagination.

Get project
:   Fetch full details of a single Jira project by its key or numeric ID. Returns project name, description, issue types, and project lead.

Search users
:   Search for Jira users by display name, email, username, or account ID. Returns matching users with their account IDs. Use this to find account IDs for JQL `assignee` filters.

## Connector networking configuration [jira-cloud-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Set up OAuth authentication [jira-cloud-oauth-setup]

To use the Jira Cloud connector, you must create an OAuth 2.0 app in the Atlassian Developer Console and configure it for the Atlassian MCP server.

### Create an OAuth 2.0 app in Atlassian

1. Go to the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and sign in with your Atlassian account.
2. Select **Create** and choose **OAuth 2.0 integration**.
3. Enter a name for the app (for example, `Kibana Jira Cloud connector`) and agree to the developer terms, then select **Create**.
4. In the app settings, go to **Authorization** and select **Add** next to **OAuth 2.0 (3LO)**.
5. When prompted for **Access type**, select **Resource-level**. This restricts the OAuth token to the specific Jira site the user selects during authorization.
6. Set the **Callback URL** to your {{kib}} OAuth callback URL. The format is: `https://<your-kibana-url>/api/actions/connector/_oauth_callback`
7. Select **Save changes**.

### Configure permissions

1. In the app settings, go to **Permissions**.
2. Find **Jira API** and select **Add**.
3. Select **Configure** and enable the following scopes under **Classic scopes**:
   - `read:jira-work` — Read access to Jira project and issue data.
   - `read:jira-user` — Read access to Jira user information.

### Retrieve your app credentials

1. In the app settings, go to **Settings**.
2. Copy the **Client ID** and **Secret** values. Enter these when configuring the connector in {{kib}}.

For more information on Atlassian OAuth 2.0 apps, refer to [Atlassian's OAuth 2.0 (3LO) documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).
