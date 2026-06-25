---
navigation_title: "GitHub"
type: reference
description: "Use the GitHub data source to search code, issues, and pull requests, retrieve file contents, and access repository metadata using the GitHub API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# GitHub connector [github-action-type]

The GitHub data source connects to GitHub through the GitHub MCP server. It provides search across code, repositories, issues, pull requests, and users. It also provides access to commits, branches, tags, releases, teams, and file contents. It supports two authentication methods: Bearer token (personal access token) and OAuth Authorization Code.

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
   - Under **Permissions**, grant read access to the resources you need (for example, **Contents**, **Issues**, **Pull requests**, **Metadata**).
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
