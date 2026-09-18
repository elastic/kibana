---
navigation_title: "GitLab"
type: reference
description: "Search GitLab projects, manage issues and merge requests, browse repository files, list commits, and trigger CI/CD pipelines with the GitLab REST API connector."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# GitLab connector [gitlab-action-type]

The GitLab connector connects to the GitLab REST API v4. It supports searching projects, listing and managing issues and merge requests, browsing repository branches and files, listing commits and CI/CD pipelines, and triggering new pipeline runs. Both GitLab.com and self-managed GitLab instances are supported.

## Create connectors in {{kib}} [define-gitlab-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [gitlab-connector-configuration]

GitLab connectors have the following configuration properties:

GitLab API URL
:   The base URL of the GitLab REST API v4. Defaults to `https://gitlab.com/api/v4` for GitLab.com. For a self-managed instance, enter your own API base URL, for example `https://gitlab.example.com/api/v4`.

Authentication
:   A GitLab **Personal Access Token**. Refer to [Get API credentials](#gitlab-api-credentials) for instructions.

## Test connectors [gitlab-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by fetching the current authenticated user's profile from the GitLab API.

## Connector actions [gitlab-connector-actions]

The GitLab connector exposes the following actions:

`getCurrentUser`
:   Get the profile of the currently authenticated GitLab user. Returns the username, name, email, and user ID. Call this first to confirm authentication and to resolve "me" to a real user ID.

`searchProjects`
:   Search for GitLab projects (repositories) by name or keyword. Returns project IDs, names, namespace paths, and descriptions. Use the returned project ID or namespace path in other actions.

`getProject`
:   Get full details for a single GitLab project by its numeric ID or namespace path. Returns the default branch, visibility, description, star count, and other metadata.

`searchUsers`
:   Search for GitLab users by username or display name. Returns user IDs, usernames, and names. Use the returned user ID when assigning issues or merge requests.

`listIssues`
:   List issues in a GitLab project. Supports filtering by state, label, assignee username, or keyword. Returns issue IIDs, titles, labels, assignees, and state. Supports offset-based pagination.

`getIssue`
:   Get full details for a single issue by its project-internal IID. Returns the title, description, state, labels, assignees, comment count, and milestone.

`createIssue`
:   Create a new issue in a GitLab project. Returns the created issue including its IID, state, and web URL. Optionally set description, labels, assignees, milestone, and due date.

`updateIssue`
:   Update an existing issue. Supports changing the title, description, state (open or close), labels, assignees, milestone, and due date. At least one field must be provided. Note that the `labels` field replaces all existing labels.

`addIssueNote`
:   Add a comment (note) to an existing issue. Returns the created note including its ID, body, and author.

`addMergeRequestNote`
:   Add a comment (note) to an existing merge request. Returns the created note including its ID, body, and author.

`listMergeRequests`
:   List merge requests in a GitLab project. Supports filtering by state, source branch, target branch, or keyword. Returns MR IIDs, titles, branches, state, and author info. Supports offset-based pagination.

`getMergeRequest`
:   Get full details for a single merge request by its IID. Returns the title, description, source and target branches, diff stats, labels, assignees, and pipeline status.

`createMergeRequest`
:   Create a new merge request. The source branch must already exist with commits not in the target branch. Returns the created MR including its IID and web URL. Optionally set description, assignees, labels, and squash or delete-source-branch options.

`updateMergeRequest`
:   Update an existing merge request. Supports changing the title, description, state (close or reopen), target branch, labels, assignees, squash, and remove-source-branch settings. At least one field must be provided.

`acceptMergeRequest`
:   Merge an open merge request. Fails if the MR has conflicts or outstanding required approvals. Returns the merged MR including the merge commit SHA. Optionally set the merge commit message, squash preference, and whether to delete the source branch.

`requestMergeRequestReview`
:   Set the reviewers on a merge request. Replaces all existing reviewers. Use `searchUsers` to find user IDs. Returns the updated merge request.

`listBranches`
:   List repository branches in a GitLab project. Returns branch names, the HEAD commit SHA, and protection status. Supports filtering by name substring.

`createBranch`
:   Create a new branch in a GitLab repository. Returns the created branch and its HEAD commit SHA. Use `listBranches` or `listCommits` to find a valid ref to branch from.

`getFile`
:   Get the contents of a file from a GitLab repository. Returns the file content (base64-encoded in the `content` field), size, and last commit info. Decode the `content` field from base64 to read the raw text. For very large files this may produce a large payload.

`listCommits`
:   List commits in a GitLab repository. Returns commit SHAs, author names, commit messages, and timestamps. Optionally filter by branch or date range.

`listPipelines`
:   List CI/CD pipelines in a GitLab project. Returns pipeline IDs, status, branch or tag name, commit SHA, and timestamps. Supports filtering by ref name or pipeline status.

`createOrUpdateFile`
:   Create or update a single file in a GitLab repository. File content can be plain text or Base64-encoded binary. When updating an existing file, provide the `lastCommitId` (from `getFile`) to detect conflicts. Returns the file path and the resulting commit SHA.

`triggerPipeline`
:   Trigger a new CI/CD pipeline in a GitLab project on the specified branch or tag. Returns the created pipeline ID and initial status. Optionally pass pipeline variables.

## Get API credentials [gitlab-api-credentials]

To use the GitLab connector, create a Personal Access Token with the required scope:

1. In GitLab, go to your avatar in the upper-right corner and select **Edit profile**.
2. In the left sidebar, select **Access Tokens**.
3. Select **Add new token**.
4. Give the token a name, set an expiration date, and select the required scopes:
   - `api` — for full read and write access (required for create, update, and merge actions).
   - `read_api` — for read-only access (sufficient for search, list, and get actions only).
5. Select **Create personal access token**.
6. Copy the token immediately — it is only shown once.

Use this token in the **Personal Access Token** field when creating the connector.

:::{note}
For self-managed GitLab instances, set the **GitLab API URL** to your instance's API endpoint, for example `https://gitlab.example.com/api/v4`.
:::
