---
navigation_title: "GitLab"
type: reference
description: "Use the GitLab connector to manage issues, merge requests, branches, files, and CI/CD pipelines, and to search code in GitLab.com or self-managed GitLab."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# GitLab connector [gitlab-action-type]

The GitLab connector lets a workflow or agent drive GitLab from a step without hand-rolling REST calls. It can:

- Resolve projects, users, and groups.
- List, read, create, update, and comment on issues.
- List, read, create, update, approve, merge, and comment on merge requests.
- List and create branches, read commit history and diffs, read and write repository files, list tags and labels, and search code.
- List, read, trigger, cancel, and retry CI/CD pipelines, list jobs, read job logs and artifacts, and list pipeline schedules, environments, and deployments.

## Overview

The connector calls the [GitLab REST API v4](https://docs.gitlab.com/api/rest/) on GitLab.com by default, or on a self-managed or GitLab Dedicated instance when you set the **GitLab URL**. Every project-scoped action accepts the project's numeric ID or its `namespace/project` path.

## Create connectors in {{kib}} [define-gitlab-ui]

You can create a GitLab connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [gitlab-connector-configuration]

GitLab URL
:   Optional. Leave empty for GitLab.com (`https://gitlab.com`). For a self-managed or dedicated instance, enter its base URL, for example `https://gitlab.example.com`, without `/api/v4`.

Authentication
:   A GitLab personal, project, group, or instance access token with the `api` scope (`read_api` is enough for read-only use). Fine-grained tokens need the Projects, Project Planning, Repository, CI/CD, Search, Groups, and Note resources. Choose how the token is sent:
    - **Access token (PRIVATE-TOKEN header)** (recommended): sends the token as the `PRIVATE-TOKEN` header.
    - **Access token (Authorization: Bearer)**: sends the same token as an `Authorization: Bearer` header, for proxies that strip custom headers.

## Available actions [gitlab-available-actions]

| Action | Description |
|--------|-------------|
| `listProjects` | List projects the token can see. Parameters: `search`, `membership` (default true), `owned`, `visibility`, `orderBy`, `sort`, `page`, `perPage`. |
| `getProject` | Get a project by ID or path. Parameters: `projectId` (required). |
| `listUsers` | Find users by name, username, or email. Parameters: `search`, `username`, `active`, `page`, `perPage`. |
| `listGroups` | List groups. Parameters: `search`, `topLevelOnly`, `page`, `perPage`. |
| `listIssues` | List issues in a project. Parameters: `projectId` (required), `state`, `labels`, `search`, `assigneeUsername`, `authorUsername`, `createdAfter`, `updatedAfter`, `orderBy`, `sort`, `page`, `perPage`. |
| `getIssue` | Get an issue. Parameters: `projectId` (required), `issueIid` (required). |
| `createIssue` | Create an issue. Parameters: `projectId` (required), `title` (required), `description`, `labels`, `assigneeIds`, `confidential`, `issueType`, `dueDate`. |
| `updateIssue` | Update, close, reopen, relabel, or reassign an issue. Parameters: `projectId` (required), `issueIid` (required), and at least one of `title`, `description`, `stateEvent`, `labels`, `addLabels`, `removeLabels`, `assigneeIds`, `confidential`, `dueDate`. |
| `createIssueNote` | Comment on an issue. Parameters: `projectId` (required), `issueIid` (required), `body` (required), `internal`. |
| `listMergeRequests` | List merge requests. Parameters: `projectId` (required), `state`, `sourceBranch`, `targetBranch`, `labels`, `search`, `authorUsername`, `orderBy`, `sort`, `page`, `perPage`. |
| `getMergeRequest` | Get a merge request with its merge status, approvals, and changed files. Parameters: `projectId` (required), `mergeRequestIid` (required), `includeDiffSummary` (default true). |
| `createMergeRequest` | Open a merge request. Parameters: `projectId` (required), `title` (required), `sourceBranch` (required), `targetBranch` (required), `description`, `labels`, `assigneeIds`, `reviewerIds`, `removeSourceBranch`, `squash`. |
| `updateMergeRequest` | Update, close, or reopen a merge request. Parameters: `projectId` (required), `mergeRequestIid` (required), and at least one of `title`, `description`, `targetBranch`, `stateEvent`, `labels`, `addLabels`, `removeLabels`, `assigneeIds`, `reviewerIds`, `removeSourceBranch`, `squash`. |
| `approveMergeRequest` | Approve a merge request. Parameters: `projectId` (required), `mergeRequestIid` (required), `sha`. |
| `acceptMergeRequest` | Merge a merge request, or set it to auto-merge. Parameters: `projectId` (required), `mergeRequestIid` (required), `mergeCommitMessage`, `squash`, `squashCommitMessage`, `shouldRemoveSourceBranch`, `autoMerge`, `sha`. |
| `createMergeRequestNote` | Comment on a merge request. Parameters: `projectId` (required), `mergeRequestIid` (required), `body` (required), `internal`. |
| `listBranches` | List branches. Parameters: `projectId` (required), `search`, `page`, `perPage`. |
| `createBranch` | Create a branch from a ref. Parameters: `projectId` (required), `branch` (required), `ref` (required). |
| `listCommits` | List commits. Parameters: `projectId` (required), `refName`, `path`, `since`, `until`, `author`, `page`, `perPage`. |
| `getCommit` | Get a commit and its diff. Parameters: `projectId` (required), `sha` (required), `includeDiff` (default true). |
| `getFile` | Read a repository file. Parameters: `projectId` (required), `filePath` (required), `ref` (required). |
| `createFile` | Commit a new file. Parameters: `projectId` (required), `filePath` (required), `branch` (required), `commitMessage` (required), `content` (required), `startBranch`, `authorName`, `authorEmail`. |
| `updateFile` | Commit new content to an existing file. Parameters: `projectId` (required), `filePath` (required), `branch` (required), `commitMessage` (required), `content` (required), `lastCommitId`, `startBranch`, `authorName`, `authorEmail`. |
| `deleteFile` | Commit a file deletion. Parameters: `projectId` (required), `filePath` (required), `branch` (required), `commitMessage` (required), `lastCommitId`, `authorName`, `authorEmail`. |
| `listTags` | List tags. Parameters: `projectId` (required), `search`, `orderBy`, `sort`, `page`, `perPage`. |
| `listLabels` | List project and inherited group labels. Parameters: `projectId` (required), `search`, `page`, `perPage`. |
| `searchCode` | Search file contents in a project, group, or the instance. Parameters: `search` (required), `projectId`, `groupId`, `ref`, `page`, `perPage`. |
| `listPipelines` | List pipelines. Parameters: `projectId` (required), `status`, `ref`, `sha`, `source`, `username`, `updatedAfter`, `orderBy`, `sort`, `page`, `perPage`. |
| `getPipeline` | Get a pipeline's status. Parameters: `projectId` (required), `pipelineId` (required). |
| `triggerPipeline` | Start a pipeline for a ref. Parameters: `projectId` (required), `ref` (required), `variables`. |
| `cancelPipeline` | Cancel a running pipeline. Parameters: `projectId` (required), `pipelineId` (required). |
| `retryPipeline` | Retry the failed jobs of a pipeline. Parameters: `projectId` (required), `pipelineId` (required). |
| `listJobs` | List the jobs of a pipeline. Parameters: `projectId` (required), `pipelineId` (required), `scope`, `includeRetried`, `page`, `perPage`. |
| `getJobArtifact` | Read a job's log or a text artifact file. Parameters: `projectId` (required), `jobId` (required), `artifactPath`, `maxLength` (default 20000). |
| `listPipelineSchedules` | List scheduled pipelines. Parameters: `projectId` (required), `scope`, `page`, `perPage`. |
| `listEnvironments` | List environments. Parameters: `projectId` (required), `search`, `states`, `page`, `perPage`. |
| `listDeployments` | List deployments. Parameters: `projectId` (required), `environment`, `status`, `updatedAfter`, `orderBy`, `sort`, `page`, `perPage`. |

Instance-wide and group-wide `searchCode` require GitLab Advanced Search (Premium or Ultimate) and return `403` on other tiers. Project-scoped search works on every tier.

`triggerPipeline` requires a `.gitlab-ci.yml` on the ref. Passing `variables` also requires the project's **Settings → CI/CD → Variables → Minimum role to use pipeline variables** to include the token's role (new projects default to **No one allowed**). On GitLab.com, free namespaces must complete identity verification before any CI job can run.

## Connector networking configuration [gitlab-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [gitlab-api-credentials]

To create a personal access token on GitLab.com or a self-managed instance:

1. Sign in to GitLab and open **User settings → Access tokens** (on GitLab.com: [https://gitlab.com/-/user_settings/personal_access_tokens](https://gitlab.com/-/user_settings/personal_access_tokens)).
2. Select **Add new token**. On instances that offer fine-grained tokens, open the **Generate token** dropdown and choose **Legacy token** to use scopes.
3. Enter a name (for example, `Kibana connector`) and an expiry date.
4. Select the `api` scope. For a read-only connector, `read_api` is sufficient. If you use a fine-grained token instead, grant the Projects, Project Planning, Repository, CI/CD, Search, Groups, and Note resources for the projects you want to automate.
5. Select **Create personal access token** and copy the token (it starts with `glpat-`).
6. When configuring the connector in {{kib}}, paste the token as the **Access token**, and set **GitLab URL** only if you are not using GitLab.com.

Project, group, and instance access tokens work the same way. They act as bot users and cannot approve their own merge requests. Refer to the [GitLab token documentation](https://docs.gitlab.com/security/tokens/) for the differences.
