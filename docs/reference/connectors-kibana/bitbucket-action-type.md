---
navigation_title: "Bitbucket"
type: reference
description: "Use the Bitbucket connector to open, review, comment on, and merge pull requests, create branches, report commit build statuses, and trigger pipelines in Bitbucket Cloud."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Bitbucket connector [bitbucket-action-type]

The Bitbucket connector lets a workflow or agent drive the pull request, branch, and pipeline lifecycle on a Bitbucket Cloud workspace without opening the Bitbucket UI. It can:

- Open, read, comment on, update, approve, decline, and merge pull requests.
- Create, read, and delete branches, and read commit metadata.
- Report external check results back onto a commit as build statuses.
- Trigger, poll, and stop Bitbucket Pipelines runs.

## Overview

The connector calls the [Bitbucket Cloud REST API 2.0](https://developer.atlassian.com/cloud/bitbucket/rest/) directly. Every action runs against the workspace configured on the connector, and repositories are addressed by their slug. Bitbucket Server and Data Center are not supported.

## Create connectors in {{kib}} [define-bitbucket-ui]

You can create a Bitbucket connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [bitbucket-connector-configuration]

Workspace
:   The slug of your Bitbucket workspace, found in repository URLs: `bitbucket.org/<workspace>/<repo>`. Every action on this connector runs against this workspace.

Authentication
:   Choose one of the following:
    - **Atlassian email and API token** (recommended): Basic authentication using the email address of an Atlassian account and an API token created **with scopes** for the Bitbucket app. Grant the `read:repository:bitbucket`, `write:repository:bitbucket`, `read:pullrequest:bitbucket`, `write:pullrequest:bitbucket`, `read:pipeline:bitbucket`, and `write:pipeline:bitbucket` scopes. Bitbucket rejects API tokens created without scopes. Refer to [Get API credentials](#bitbucket-api-credentials).
    - **Access token**: Bearer authentication using a Bitbucket repository, project, or workspace access token with the `repository:write`, `pullrequest:write`, and `pipeline:write` scopes. Access tokens act as a service identity rather than a user, so they cannot approve pull requests.

## Available actions [bitbucket-available-actions]

| Action | Description |
|--------|-------------|
| `listRepositories` | List the repositories in the configured workspace. Parameters: `query`, `role`, `sort`, `page`, `pageSize`. |
| `createPullRequest` | Open a pull request from a source branch to a destination branch. Parameters: `repoSlug` (required), `title` (required), `sourceBranch` (required), `destinationBranch`, `description`, `reviewers`, `closeSourceBranch`, `draft`. |
| `getPullRequest` | Get a pull request with its state, branches, reviewers, participants, approval count, and merge commit. Parameters: `repoSlug` (required), `pullRequestId` (required). |
| `listPullRequests` | List pull requests filtered by state and query. Parameters: `repoSlug` (required), `state`, `query`, `sort`, `page`, `pageSize`. |
| `updatePullRequest` | Edit a pull request's title, description, destination branch, or reviewers. Parameters: `repoSlug` (required), `pullRequestId` (required), and at least one of `title`, `description`, `destinationBranch`, `reviewers`. |
| `mergePullRequest` | Merge an open pull request. Parameters: `repoSlug` (required), `pullRequestId` (required), `mergeStrategy`, `message`, `closeSourceBranch`. |
| `approvePullRequest` | Approve a pull request as the authenticated user. Parameters: `repoSlug` (required), `pullRequestId` (required). |
| `declinePullRequest` | Decline an open pull request. Parameters: `repoSlug` (required), `pullRequestId` (required). |
| `addPullRequestComment` | Post a general, inline, or threaded comment on a pull request. Parameters: `repoSlug` (required), `pullRequestId` (required), `content` (required), `path`, `line`, `parentCommentId`. |
| `createBranch` | Create a branch from a commit hash or branch name. Parameters: `repoSlug` (required), `name` (required), `target` (required). |
| `getBranch` | Get a branch and its tip commit. Parameters: `repoSlug` (required), `name` (required). |
| `deleteBranch` | Delete a branch. Parameters: `repoSlug` (required), `name` (required). |
| `getCommit` | Get a commit's message, author, date, and parents. Parameters: `repoSlug` (required), `commit` (required). |
| `listCommits` | List commits from a branch, tag, or commit, optionally limited to a path. Parameters: `repoSlug` (required), `revision`, `path`, `page`, `pageSize`. |
| `createCommitBuildStatus` | Report a build status (`INPROGRESS`, `SUCCESSFUL`, `FAILED`, or `STOPPED`) on a commit. Parameters: `repoSlug` (required), `commit` (required), `state` (required), `key` (required), `url` (required), `name`, `description`, `refname`. |
| `triggerPipeline` | Start a Bitbucket Pipelines run for a branch or commit. Parameters: `repoSlug` (required), at least one of `branch` or `commit`, `customPipeline`, `variables`. |
| `getPipeline` | Get a pipeline run's state and result. Parameters: `repoSlug` (required), `pipelineUuid` (required). |
| `stopPipeline` | Stop a pending or running pipeline. Parameters: `repoSlug` (required), `pipelineUuid` (required). |

## Connector networking configuration [bitbucket-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [bitbucket-api-credentials]

To use the Bitbucket connector with an Atlassian email and API token:

1. Log in to your [Atlassian account](https://id.atlassian.com/) as a user with access to the Bitbucket workspace.
2. Go to **Security** > **API tokens** (or open [API token management](https://id.atlassian.com/manage-profile/security/api-tokens) directly).
3. Select **Create API token with scopes**. API tokens created without scopes are rejected by the Bitbucket API.
4. Enter a label (for example, `Kibana connector`), choose an expiry, and select the **Bitbucket** app.
5. Grant the `read:repository:bitbucket`, `write:repository:bitbucket`, `read:pullrequest:bitbucket`, `write:pullrequest:bitbucket`, `read:pipeline:bitbucket`, and `write:pipeline:bitbucket` scopes.
6. Copy the token and store it securely. When configuring the connector in {{kib}}, enter your Atlassian account email as the **Atlassian account email**, the token as the **API token**, and your workspace slug in the **Workspace** field.

To use a repository, project, or workspace access token instead, create it in the Bitbucket repository, project, or workspace settings under **Access tokens**, grant the `repository:write`, `pullrequest:write`, and `pipeline:write` scopes, and enter it as the **Access token**. Refer to the [Bitbucket access tokens documentation](https://support.atlassian.com/bitbucket-cloud/docs/access-tokens/).
