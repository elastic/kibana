---
navigation_title: "GitHub"
type: reference
description: "Use the GitHub data source to search code, issues, and pull requests, retrieve file contents, and access repository metadata via the GitHub API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# GitHub connector [github-action-type]

The GitHub data source connects to GitHub via the GitHub MCP server and the GitHub REST API. It provides search across code, repositories, issues, pull requests, and users, as well as access to commits, branches, tags, releases, teams, and file contents. It uses Bearer token (personal access token) authentication.

## Create connectors in {{kib}} [define-github-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [github-connector-configuration]

GitHub connectors have the following configuration properties:

Bearer Token
:   A GitHub personal access token for authentication. Refer to [Get API credentials](#github-api-credentials) for instructions.

## Test connectors [github-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The GitHub data source exposes the following tools via MCP:

get_me
:   Get the authenticated GitHub user's profile information.

list_issues
:   List issues in a repository.

list_pull_requests
:   List pull requests in a repository.

pull_request_read
:   Read the details of a specific pull request.

list_commits
:   List commits in a repository.

get_commit
:   Get details of a specific commit.

list_branches
:   List branches in a repository.

list_tags
:   List tags in a repository.

get_tag
:   Get details of a specific tag.

list_releases
:   List releases in a repository.

get_latest_release
:   Get the latest release for a repository.

get_label
:   Get details of a specific label.

list_issue_types
:   List available issue types in a repository.

get_teams
:   List teams in an organization.

get_team_members
:   List members of a specific team.

The following workflow actions are also available:

Search
:   Search through GitHub code, repositories, issues, pull requests, and users using GitHub query syntax.
    - **tool_name** (required): The type of search to perform. Valid values: `search_code`, `search_repositories`, `search_issues`, `search_pull_requests`, `search_users`.
    - **query** (required): The search query string using GitHub query syntax.
    - **order** (optional): Sort order. Valid values: `asc`, `desc`. Defaults to `desc`.
    - **page** (optional): Page number for pagination. Defaults to 1.
    - **per_page** (optional): Number of results per page. Defaults to 10.
    - **sort** (optional): Sort field. Valid values: `comments`, `reactions`, `reactions-+1`, `reactions--1`, `reactions-smile`, `reactions-thinking_face`, `reactions-heart`, `reactions-tada`, `interactions`, `created`, `updated`. Defaults to `created`.

Get file contents
:   Get the contents of a file from a GitHub repository.
    - **owner** (required): The owner of the repository (username or organization).
    - **repo** (required): The name of the repository.
    - **path** (required): The path to the file in the repository.
    - **ref** (optional): The branch, tag, or commit SHA. Defaults to the repository's default branch.

## Connector networking configuration [github-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [github-api-credentials]

To use the GitHub connector, you need a GitHub personal access token:

1. Log in to [GitHub](https://github.com/).
2. Go to **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** (or [create one directly](https://github.com/settings/personal-access-tokens/new)).
3. Click **Generate new token**.
4. Configure the token:
   - Set a descriptive name (for example, "Kibana data source").
   - Choose an expiration period.
   - Select the repositories you want to grant access to.
   - Under **Permissions**, grant read access to the resources you need (for example, **Contents**, **Issues**, **Pull requests**, **Metadata**).
5. Click **Generate token**.
6. Copy the token and store it securely. Use this value as the **Bearer Token** when configuring the GitHub connector in {{kib}}.

::::{note}
Classic personal access tokens also work. When using a classic token, select the `repo` scope for full repository access, or `public_repo` for public repositories only.
::::
