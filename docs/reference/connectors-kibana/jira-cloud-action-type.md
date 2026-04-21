---
navigation_title: "Jira Cloud"
type: reference
description: "Use the Jira Cloud connector to search issues with JQL, retrieve issue and project details, and look up users from your Jira Cloud site."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Jira Cloud connector [jira-cloud-action-type]

The Jira Cloud connector communicates with the Jira Cloud REST API v3 to search issues, retrieve project and issue details, and look up users. It supports two authentication methods: Basic authentication (email and API token) and OAuth 2.0 Authorization Code flow. Both methods connect to your Atlassian site by subdomain.

## Create connectors in {{kib}} [define-jira-cloud-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [jira-cloud-connector-configuration]

Jira Cloud connectors have the following configuration properties:

Subdomain
:   Your Atlassian subdomain (for example, `your-domain` for `https://your-domain.atlassian.net`).

Authentication type
:   The method used to authenticate with Jira Cloud. Choose one of the following:
    - **Basic**: Uses an email address and API token. Refer to [Get API credentials](#jira-cloud-api-credentials).
    - **OAuth 2.0 Authorization Code**: Uses an OAuth app for delegated, per-user access. Refer to [Set up OAuth authentication](#jira-cloud-oauth-setup).

#### Basic authentication fields

Email
:   The email address associated with your Atlassian account.

API token
:   A Jira API token for authentication. Refer to [Get API credentials](#jira-cloud-api-credentials) for instructions.

#### OAuth 2.0 authentication fields

Client ID
:   The client ID from your Atlassian OAuth 2.0 app.

Client secret
:   The client secret from your Atlassian OAuth 2.0 app.

Cloud ID
:   Your Jira Cloud site's unique identifier, required for OAuth. To find your Cloud ID, visit `https://<your-subdomain>.atlassian.net/_edge/tenant_info` and use the `cloudId` value from the JSON response.

## Test connectors [jira-cloud-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Jira Cloud connector has the following actions:

Search issues with JQL
:   Search or filter Jira issues using JQL (Jira Query Language).
    - `jql` (required): A JQL query string (for example, `project = PROJ AND status = "In Progress"`).
    - `maxResults` (optional): Maximum number of issues to return.
    - `nextPageToken` (optional): Pagination token from a previous response.

Get resource
:   Retrieve full details of a single Jira issue or project by ID or key.
    - `resourceType` (required): The type of resource to retrieve. Valid values: `issue`, `project`.
    - `id` (required): The issue key (for example, `PROJ-123`) or project ID.

Get projects
:   List or search Jira projects.
    - `query` (optional): Search term to filter projects by name or key.
    - `maxResults` (optional): Maximum number of projects to return.
    - `startAt` (optional): Index of the first result for pagination.

Search users
:   Search for Jira users by name, username, or email.
    - `query` (optional): A search string matching display name, email, or username.
    - `username` (optional): Filter by exact username.
    - `accountId` (optional): Filter by exact account ID.
    - `startAt` (optional): Index of the first result for pagination.
    - `maxResults` (optional): Maximum number of users to return.
    - `property` (optional): A user property key to filter by.

## Connector networking configuration [jira-cloud-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [jira-cloud-api-credentials]

To use the Jira Cloud connector with Basic authentication, you need a Jira API token:

1. Log in to your [Atlassian account](https://id.atlassian.com/).
2. Go to **Security** > **API tokens** (or open [API token management](https://id.atlassian.com/manage-profile/security/api-tokens) directly).
3. Select **Create API token**.
4. Enter a label (for example, `Kibana connector`) and select **Create**.
5. Copy the token and store it securely. Enter this value as the **API token** when configuring the connector in {{kib}}. The email address associated with your Atlassian account is used as the username for Basic authentication.

## Set up OAuth authentication [jira-cloud-oauth-setup]

To use the Jira Cloud connector with OAuth 2.0, you must create an OAuth app in the Atlassian Developer Console and configure it to work with {{kib}}.

### Create an OAuth 2.0 app in Atlassian

1. Go to the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and sign in with your Atlassian account.
2. Select **Create** and choose **OAuth 2.0 integration**.
3. Enter a name for the app (for example, `Kibana connector`) and agree to the developer terms, then select **Create**.
4. In the app settings, go to **Authorization** and select **Add** next to **OAuth 2.0 (3LO)**.
5. Set the **Callback URL** to your {{kib}} OAuth callback URL. The format is: `https://<your-kibana-url>/api/actions/_oauth_callback`
6. Select **Save changes**.

### Configure permissions

1. In the app settings, go to **Permissions**.
2. Find **Jira API** and select **Add**.
3. Select **Configure** and enable the following scopes under **Classic scopes**:
   - `read:jira-work` — Read access to Jira project and issue data.
   - `read:jira-user` — Read access to Jira user information.

### Retrieve your app credentials

1. In the app settings, go to **Settings**.
2. Copy the **Client ID** and **Secret** values. Enter these when configuring the connector in {{kib}}.

### Find your Cloud ID

1. Navigate to `https://<your-subdomain>.atlassian.net/_edge/tenant_info` in your browser (replace `<your-subdomain>` with your Atlassian subdomain).
2. Copy the `cloudId` value from the JSON response. Enter this when configuring the connector in {{kib}}.

For more information on Atlassian OAuth 2.0 apps, refer to [Atlassian's OAuth 2.0 (3LO) documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).
