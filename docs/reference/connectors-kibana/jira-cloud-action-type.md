---
navigation_title: "Jira Cloud"
type: reference
description: "Use the Jira Cloud connector to create, update, and track Jira issues; search with JQL; manage transitions, comments, and attachments; and look up users and projects."
applies_to:
  stack: preview 9.4, ga 9.6+
  serverless: preview
---

# Jira Cloud connector [jira-cloud-action-type]

The Jira Cloud connector communicates with the Jira Cloud REST API v3 to search, create, and manage issues, projects, and users. It supports two authentication methods: Basic authentication (email and API token) and OAuth 2.0 Authorization Code flow. Both methods connect to your Atlassian site by subdomain.

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

### Read actions

Search issues with JQL (`searchIssuesWithJql`)
:   Search or filter Jira issues using JQL (Jira Query Language).
    - `jql` (required): A JQL query string (for example, `project = PROJ AND status = "In Progress"`).
    - `maxResults` (optional): Maximum number of issues to return per page.
    - `nextPageToken` (optional): Pagination token from a previous response.

Get issue (`getIssue`)
:   Retrieve full details of a single Jira issue by key or ID.
    - `issueId` (required): The issue key (for example, `PROJ-123`) or numeric issue ID.

Get projects (`getProjects`)
:   List or search Jira projects.
    - `query` (optional): Search term to filter projects by name or key.
    - `maxResults` (optional): Maximum number of projects to return.
    - `startAt` (optional): Index of the first result for pagination.

Get project (`getProject`)
:   Retrieve full details of a single Jira project by key or ID.
    - `projectId` (required): The project key (for example, `PROJ`) or numeric project ID.

Get issue types (`getIssueTypes`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   List the issue types available in a project (for example, Bug, Task, Story). Use before `createIssue` to discover valid type names and IDs.
    - `projectKey` (required): The project key (for example, `PROJ`).

Get create metadata (`getCreateMetadata`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Return the required and optional fields for creating an issue of a specific type. Use after `getIssueTypes` to build a valid `createIssue` payload.
    - `projectKey` (required): The project key.
    - `issueTypeId` (required): The numeric issue type ID from `getIssueTypes`.

Get transitions (`getTransitions`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   List the workflow transitions available for an issue. Use before `transitionIssue` — Jira requires a transition ID, not a status name.
    - `issueId` (required): The issue key or numeric ID.

Get attachment (`getAttachment`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Download the content of an attachment by its ID. Returns the file as a base64-encoded string with its MIME type. Attachment IDs are found in a `getIssue` response.
    - `attachmentId` (required): The numeric attachment ID.

Search users (`searchUsers`)
:   Search for Jira users by name, username, or email. Returns `accountId` values required by `assignIssue` and `addWatcher`.
    - `query` (optional): A search string matching display name, email, or username.
    - `username` (optional): Filter by exact username.
    - `accountId` (optional): Filter by exact account ID.
    - `startAt` (optional): Index of the first result for pagination.
    - `maxResults` (optional): Maximum number of users to return.
    - `property` (optional): A user property key to filter by.

### Write actions

Create issue (`createIssue`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Create a new Jira issue.
    - `projectKey` (required): The project key (for example, `PROJ`).
    - `summary` (required): The issue title.
    - `issueType` (required): Issue type name (for example, `Bug`) or numeric ID. Use `getIssueTypes` to list valid types for the project.
    - `description` (optional): Issue body in plain text. Newlines become separate paragraphs in Jira.
    - `priority` (optional): Priority name (for example, `High`, `Medium`, `Low`).
    - `labels` (optional): Array of label strings. Labels cannot contain spaces.
    - `assigneeAccountId` (optional): Atlassian account ID of the assignee. Use `searchUsers` to resolve a name or email.
    - `parent` (optional): Parent issue key for creating a subtask (for example, `PROJ-10`).

Update issue (`updateIssue`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Update fields on an existing issue. Only the fields you provide are changed; omitted fields are left as-is.
    - `issueId` (required): The issue key or numeric ID.
    - `summary`, `description`, `issueType`, `priority`, `labels`, `parent` (optional): Same format as `createIssue`.
    - `assigneeAccountId` (optional): Account ID to assign, or `null` to unassign.

Add comment (`addComment`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Post a comment on an existing issue.
    - `issueId` (required): The issue key or numeric ID.
    - `body` (required): Comment text in plain text. Newlines become separate paragraphs.

Transition issue (`transitionIssue`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Move an issue to a new status by executing a workflow transition. Call `getTransitions` first to get the transition ID — Jira does not accept status names directly.
    - `issueId` (required): The issue key or numeric ID.
    - `transitionId` (required): The transition ID from `getTransitions`.

Assign issue (`assignIssue`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Assign an issue to a user, set it to the project default, or unassign it.
    - `issueId` (required): The issue key or numeric ID.
    - `accountId` (required): The Atlassian account ID from `searchUsers`, `"-1"` for the default assignee, or `null` to unassign.

Add attachment (`addAttachment`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Attach a file to an issue. The file content must be provided as a base64-encoded string.
    - `issueId` (required): The issue key or numeric ID.
    - `file` (required): Base64-encoded file content.
    - `filename` (required): Filename including extension (for example, `screenshot.png`).

Link issues (`linkIssues`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Create a directional link between two issues (for example, "Relates", "Blocks", "Duplicate").
    - `inwardIssueKey` (required): Key of the inward issue.
    - `outwardIssueKey` (required): Key of the outward issue.
    - `linkType` (required): Link type name as configured in your Jira instance. The value is case-sensitive and must match exactly (for example, `"Relates"` not `"relates to"`).
    - `comment` (optional): A plain-text comment to add to the link.

Delete issue (`deleteIssue`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Permanently delete an issue. This action is irreversible and is not available as an agent tool.
    - `issueId` (required): The issue key or numeric ID.
    - `deleteSubtasks` (optional): Set to `true` to also delete subtasks. Required if the issue has subtasks.

Add watcher (`addWatcher`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Add a user to the watcher list for an issue.
    - `issueId` (required): The issue key or numeric ID.
    - `accountId` (required): The Atlassian account ID from `searchUsers`.

Remove watcher (`removeWatcher`) {applies_to}`serverless: preview` {applies_to}`stack: ga 9.6+`
:   Remove a user from the watcher list for an issue.
    - `issueId` (required): The issue key or numeric ID.
    - `accountId` (required): The Atlassian account ID of the watcher to remove.

### Typical usage patterns

- **Create and track a remediation issue**: `getIssueTypes` → `getCreateMetadata` → `createIssue` → `addComment` → `transitionIssue` (close when resolved)
- **Transition an issue**: `getTransitions` (to get the transition ID) → `transitionIssue`
- **Assign an issue**: `searchUsers` (to get the account ID) → `assignIssue`
- **Find and update**: `searchIssuesWithJql` → `getIssue` → `updateIssue`

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
5. Set the **Callback URL** to your {{kib}} OAuth callback URL. The format is: `https://<your-kibana-url>/api/actions/connector/_oauth_callback`
6. Select **Save changes**.

### Configure permissions

1. In the app settings, go to **Permissions**.
2. Find **Jira API** and select **Add**.
3. Select **Configure** and enable the following scopes under **Classic scopes**:
   - `read:jira-work` — Read access to Jira project and issue data.
   - `read:jira-user` — Read access to Jira user information.
   - `write:jira-work` — Create and update issues, comments, attachments, transitions, and watchers.

:::{note}
If you previously authorized an OAuth connector without the `write:jira-work` scope, write actions return a 403 error until you re-authorize the connector. Basic authentication connectors are unaffected — write access is controlled by the Jira account's project permissions.
:::

### Retrieve your app credentials

1. In the app settings, go to **Settings**.
2. Copy the **Client ID** and **Secret** values. Enter these when configuring the connector in {{kib}}.

### Find your Cloud ID

1. Navigate to `https://<your-subdomain>.atlassian.net/_edge/tenant_info` in your browser (replace `<your-subdomain>` with your Atlassian subdomain).
2. Copy the `cloudId` value from the JSON response. Enter this when configuring the connector in {{kib}}.

For more information on Atlassian OAuth 2.0 apps, refer to [Atlassian's OAuth 2.0 (3LO) documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).
