---
navigation_title: "Jira Cloud"
type: reference
description: "Use the Jira Cloud connector to search issues with JQL, retrieve issue and project details, and look up users from your Jira Cloud site."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Jira Cloud connector [jira-cloud-action-type]

The Jira Cloud connector communicates with the Jira Cloud REST API v3 to search issues, retrieve project and issue details, and look up users. It uses Basic authentication (email and API token) and connects to your Atlassian site by subdomain.

## Create connectors in {{kib}} [define-jira-cloud-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [jira-cloud-connector-configuration]

Jira Cloud connectors have the following configuration properties:

Subdomain
:   Your Atlassian subdomain (for example, `your-domain` for `https://your-domain.atlassian.net`).

Email
:   The email address associated with your Atlassian account.

API token
:   A Jira API token for authentication. Refer to [Get API credentials](#jira-cloud-api-credentials) for instructions.

## Test connectors [jira-cloud-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Jira Cloud connector has the following actions:

Search issues with JQL
:   Search or filter Jira issues using JQL (Jira Query Language).
    - **jql** (required): A JQL query string (for example, `project = PROJ AND status = "In Progress"`).
    - **maxResults** (optional): Maximum number of issues to return.
    - **nextPageToken** (optional): Pagination token from a previous response.

Get resource
:   Fetch full details of a single Jira issue or project by ID or key.
    - **resourceType** (required): The type of resource to fetch. Valid values: `issue`, `project`.
    - **id** (required): The issue key (for example, `PROJ-123`) or project ID.

Get projects
:   List or search Jira projects.
    - **query** (optional): Search term to filter projects by name or key.
    - **maxResults** (optional): Maximum number of projects to return.
    - **startAt** (optional): Index of the first result for pagination.

Search users
:   Find Jira users by name, username, or email.
    - **query** (optional): A search string matching display name, email, or username.
    - **username** (optional): Filter by exact username.
    - **accountId** (optional): Filter by exact account ID.
    - **startAt** (optional): Index of the first result for pagination.
    - **maxResults** (optional): Maximum number of users to return.
    - **property** (optional): A user property key to filter by.

## Connector networking configuration [jira-cloud-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [jira-cloud-api-credentials]

To use the Jira Cloud connector, you need a Jira API token:

1. Log in to your [Atlassian account](https://id.atlassian.com/).
2. Go to **Security** > **API tokens** (or open [API token management](https://id.atlassian.com/manage-profile/security/api-tokens) directly).
3. Click **Create API token**.
4. Enter a label (for example, "Kibana connector") and click **Create**.
5. Copy the token and store it securely. Use this value as the **API token** when configuring the connector in {{kib}}. The email address associated with your Atlassian account is used as the username for Basic authentication.
