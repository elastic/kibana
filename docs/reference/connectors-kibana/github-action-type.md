---
navigation_title: "GitHub"
type: reference
description: "Use the GitHub data source to search code, issues, and pull requests, retrieve file contents, access repository metadata, and start a workflow from repository webhooks."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# GitHub connector [github-action-type]

The GitHub data source connects to GitHub through the GitHub MCP server. It provides search across code, repositories, issues, pull requests, and users. It also provides access to commits, branches, tags, releases, teams, and file contents. It supports two authentication methods: Bearer token (personal access token) and OAuth Authorization Code. It can start a workflow from a repository webhook.

You can use this connector in **Agent Builder** and **Workflows**.

## Create connectors in {{kib}} [define-github-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [github-connector-configuration]

GitHub connectors have the following configuration properties:

MCP Server URL
:   The URL of the GitHub MCP server. Defaults to `https://api.githubcopilot.com/mcp/`.

Authentication
:   Choose one of the following authentication methods:
    - **Bearer Token**: A GitHub personal access token. Refer to [Get API credentials](#github-api-credentials) for instructions.
    - **OAuth Authorization Code**: Connects via GitHub's OAuth flow. Requires a GitHub OAuth App with an authorization URL (`https://github.com/login/oauth/authorize`) and token URL (`https://github.com/login/oauth/access_token`). The default scope is `repo`. Refer to [OAuth credentials](#github-oauth-credentials) for setup instructions.

## Receive GitHub events [github-inbound-events]
```{applies_to}
serverless: preview
stack: preview 9.6+
```

The connector can start a workflow from a GitHub repository webhook. A saved connector does not receive events until **Receive events** is turned on for that connector. After you save a new connector, {{kib}} shows the **Webhook URL** and the ingest token once, so copy them then. For an existing connector, save it, then select **Rotate ingest token**. A new token stops the previous one from working. This toggle appears when `xpack.actions.inboundEvents.enabled` is `true`.

In GitHub, you need permission to add a webhook on the repository. GitHub must be able to reach a {{kib}} URL. GitHub cannot call `localhost`.

In {{kib}}, you need an Enterprise license and `server.publicBaseUrl` set to the host that GitHub uses to reach {{kib}}. `xpack.actions.inboundEvents.enabled` defaults to `true`. Set it to `false` to turn receive events off.

{{kib}} starts the workflows that are enabled and subscribed to the matching event. To send events from GitHub, refer to [Start a workflow from GitHub events](#github-inbound-howto).

The connector supports eight events. A workflow subscribes to an event by using its ID as the trigger `type`. The GitHub webhook body is on `event.body`.

| Workflow event | `X-GitHub-Event` | When it runs | Fields |
| --- | --- | --- | --- |
| `github.issues` | `issues` | An issue was opened, edited, reopened, closed, or otherwise changed | `event.body.action`, `event.body.issue` |
| `github.issue_comment` | `issue_comment` | A comment on an issue or pull request was created, edited, or deleted | `event.body.action`, `event.body.issue`, `event.body.comment` |
| `github.pull_request` | `pull_request` | A pull request was opened, updated, reopened, or closed. Updates use `edited` or `synchronize` | `event.body.action`, `event.body.pull_request`, including `merged` |
| `github.pull_request_review` | `pull_request_review` | A review was submitted (`action` is `submitted`) | `event.body.review.state` |
| `github.push` | `push` | Commits, a branch, or a tag were pushed | `event.body.ref`, `event.body.before`, `event.body.after` |
| `github.release` | `release` | A release was published (`action` is `published`) | `event.body.release.tag_name`, `event.body.release.id`, `event.body.release.prerelease` |
| `github.deployment_status` | `deployment_status` | A deployment status changed | `event.body.deployment_status.state` |
| `github.check_run` | `check_run` | A check run completed (`action` is `completed`) | `event.body.check_run.conclusion` |

A `ping`, or any `X-GitHub-Event` value that is not in this table, does not start a workflow. An edited or dismissed review, a release that was not published, and a check run that has not completed do not start a workflow. GitHub can send `application/json` or `application/x-www-form-urlencoded`. A form body must put the event JSON in `payload`.

### Webhook URL and authentication [github-inbound-url]

GitHub sends each delivery to the webhook URL of the connector. The **Webhook URL** field does not include the ingest token. GitHub does not send an `Authorization` header, so append the token yourself. {{kib}} does not verify a GitHub webhook secret.

The URL has one of these shapes. The default space has no `/s/<space-id>` prefix.

```text
https://<kibana-host>/api/actions/events/.github/<connector-id>?token=<ingest-token>
https://<kibana-host>/s/<space-id>/api/actions/events/.github/<connector-id>?token=<ingest-token>
```

The ingest token authenticates the webhook request. The workflow runs with the identity of the last user who saved the connector. The token is separate from the connector's outbound credentials.

## Start a workflow from GitHub events [github-inbound-howto]
```{applies_to}
serverless: preview
stack: preview 9.6+
```

To run a {{kib}} workflow when GitHub sends a repository webhook, add the webhook on the repository and point it at the webhook URL. {{kib}} does not create the webhook for you.

Before you start, meet the requirements in [Receive GitHub events](#github-inbound-events) and turn on **Receive events** on the connector. Add the webhook after the connector is saved. A delivery that was sent before the webhook existed is not delivered.

### Add the repository webhook [github-inbound-webhook]

In the repository, open **Settings → Webhooks → Add webhook**.

- **Payload URL**: the webhook URL including `?token=`.
- **Content type**: `application/json`.
- **Secret**: leave it empty, or set one. {{kib}} does not read it.
- **Which events**: **Let me select individual events**, then select Issues, Issue comments, Pull requests, Pull request reviews, Pushes, Releases, Deployment statuses, and Check runs. **Send me everything** also works. An event that is not in the table does not start a workflow.
- **Active**: selected.

Save the webhook. GitHub sends a `ping`. That request does not start a workflow.

### Confirm that GitHub calls {{kib}} [github-inbound-confirm]

On the webhook, open **Recent deliveries**. The `ping` row is the URL check.

- **A connection error.** The payload URL is not reachable from GitHub. Use a public host, and set `server.publicBaseUrl` to that host.
- **HTTP 404.** The ingest token does not match the connector, or **Receive events** was not saved before the token was rotated.
- **HTTP 202.** {{kib}} accepted the delivery. A `ping` does not start a workflow. An issue, pull request, or other event in the table does, when the workflow is enabled and subscribed to that event id, such as `github.issues`.

### Subscribe a workflow to an event [github-inbound-subscribe]

This workflow runs for `github.issues`. Replace `<connector-id>` with the connector instance id. `"*"` subscribes to every connector of this type. The other event ids in the table use the same shape.

```yaml
version: "1"
name: GitHub issue opened
enabled: true
triggers:
  - type: github.issues
    connector-id: "<connector-id>"
steps:
  - name: log_issue
    type: console
    with:
      message: "Issue {{ event.body.issue.number }} {{ event.body.action }}: {{ event.body.issue.title }}"
```

### Test with a sample event [github-inbound-example]

POST this body to the ingest URL. It starts `github.issues` with `event.body.action` `opened` and `event.body.issue.number` `42`.

```bash
curl -X POST \
  'https://<kibana-host>/api/actions/events/.github/<connector-id>?token=<ingest-token>' \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: issues' \
  -H 'X-GitHub-Delivery: delivery-123' \
  -d '{
    "action": "opened",
    "issue": { "number": 42, "title": "Example" },
    "repository": { "full_name": "elastic/example" },
    "sender": { "login": "octocat" }
  }'
```

When you test the trigger in the workflow editor, use the emitted fields as the sample event:

```json
{
  "eventType": "issues",
  "body": {
    "action": "opened",
    "issue": { "number": 42, "title": "Example" },
    "repository": { "full_name": "elastic/example" },
    "sender": { "login": "octocat" }
  }
}
```

## Test connectors [github-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The GitHub connector exposes the following actions:

`getMe`
:   Get the authenticated GitHub user's profile information.

`searchCode`
:   Search for code across GitHub repositories.

`searchRepositories`
:   Search for GitHub repositories.

`searchIssues`
:   Search for issues across GitHub repositories.

`searchPullRequests`
:   Search for pull requests across GitHub repositories.

`searchUsers`
:   Search for GitHub users.

`listIssues`
:   List issues in a repository. Uses cursor-based pagination.

`listPullRequests`
:   List pull requests in a repository. Uses cursor-based pagination.

`listCommits`
:   List commits in a repository. Uses cursor-based pagination.

`listBranches`
:   List branches in a repository. Uses cursor-based pagination.

`listTags`
:   List tags in a repository. Uses cursor-based pagination.

`listReleases`
:   List releases in a repository. Uses cursor-based pagination.

`getCommit`
:   Get details of a specific commit.

`getLatestRelease`
:   Get the latest release for a repository.

`pullRequestRead`
:   Read the details of a specific pull request.

`getFileContents`
:   Get the contents of a file or directory from a GitHub repository.

`getIssue`
:   Get details of a specific issue in a repository.

`getIssueComments`
:   Get comments for a specific issue in a repository.

`createIssue` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new issue in a repository.

`addIssueComment` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Add a comment to an existing issue or pull request.

`updateIssue` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Update an existing issue (title, body, state, assignees, labels, or milestone). To close an issue, set state to `closed`.

`addLabels` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Add one or more labels to an issue or pull request without removing existing ones.

`addAssignee` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Add one or more assignees to an issue or pull request without removing existing ones.

`createPullRequest` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new pull request. The head branch must already exist and have commits not in the base branch.

`updatePullRequest` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Update an open pull request (title, body, state, base branch, or maintainer permissions). To close a PR, set state to `closed`.

`mergePullRequest` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Merge an open pull request. Fails if the PR is not mergeable.

`requestReviewers` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Request one or more reviewers (individuals or teams) on a pull request without removing existing requests.

`createBranch` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new branch (git ref) in a repository.

`createOrUpdateFile` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create or update a single file in a repository. The content must be Base64-encoded. To update an existing file, provide the current file blob SHA (retrieved via `getFileContents`).

`triggerWorkflow` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Trigger a `workflow_dispatch` event for a GitHub Actions workflow. The workflow must have a `workflow_dispatch` trigger defined in its YAML.

`listTools`
:   List all tools available on the GitHub MCP server. Use this to discover available capabilities.

`callTool`
:   Call any tool on the GitHub MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.

## Connector networking configuration [github-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [github-api-credentials]

To use the GitHub connector with a personal access token:

1. Log in to [GitHub](https://github.com/).
2. Go to **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens** (or [create one directly](https://github.com/settings/personal-access-tokens/new)).
3. Select **Generate new token**.
4. Configure the token:
   - Set a descriptive name (for example, "Kibana data source").
   - Select an expiration period.
   - Select the repositories you want to grant access to.
   - Under **Permissions**, grant the access levels the connector requires:
     - **Read-only actions** (search, list, get): grant read access to **Contents**, **Issues**, **Pull requests**, and **Metadata**.
     - **Write actions** (createIssue, addIssueComment, updateIssue, createPullRequest, updatePullRequest, mergePullRequest, addLabels, addAssignee, requestReviewers, createBranch, createOrUpdateFile, triggerWorkflow): grant **read and write** access to **Contents**, **Issues**, and **Pull requests**. For `triggerWorkflow`, also grant **read and write** access to **Actions**.
     - **Metadata** read access is always required.
5. Select **Generate token**.
6. Copy the token and store it securely. Use this value as the **Bearer Token** when configuring the GitHub connector in {{kib}}.

::::{note}
Classic personal access tokens also work. When using a classic token, select the `repo` scope for full repository access, or `public_repo` for public repositories only.
::::

## Get OAuth credentials [github-oauth-credentials]

To use the GitHub connector with OAuth:

1. Log in to [GitHub](https://github.com/).
2. Go to **Settings** > **Developer settings** > **OAuth Apps** > **New OAuth App** (or [create one directly](https://github.com/settings/applications/new)).
3. Configure the application:
   - Set a descriptive name (for example, "Kibana GitHub Connector").
   - Set the **Authorization callback URL** to your Kibana OAuth redirect URI.
4. After creating the app, copy the **Client ID** and generate a **Client Secret**.
5. In {{kib}}, select **OAuth Authorization Code** as the authentication method and enter the Client ID and Client Secret.
