---
navigation_title: "Linear"
type: reference
description: "Find Linear teams, projects, users, and issues, then create issues, update issues, add comments, and link evidence."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Linear connector [linear-action-type]

The Linear connector uses the fixed Linear GraphQL API endpoint to find teams, projects, cycles, workflow states, labels, users, and issues, then create and update issues, add comments, and link evidence. It uses a personal Linear API key.

The initial connector rollout is available to Agent Builder. Create and update actions are defined for a planned Workflows activation after the connector reaches all Production-NonCanary versions, but they are not available during this first rollout.

## Create connectors in {{kib}} [define-linear-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [linear-connector-configuration]

Linear connectors have the following configuration property:

API key
:   A personal API key created in Linear **Settings > Security & access**. Enter the raw key. Do not add a `Bearer` prefix. Read is required for reads. Broad Write permits `createIssue`, `updateIssue`, `createComment`, and `createAttachment` and was live-tested. If `updateIssue` is not needed, Create issues permits `createIssue` and `createAttachment`, and Create comments permits `createComment`. Admin is not required.

The endpoint is always `https://api.linear.app/graphql` and cannot be changed in the connector configuration.

## Test connectors [linear-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test reads the current Linear user with the `viewer` query.

## Connector actions [linear-connector-actions]

List teams (`listTeams`)
:   List teams. Use the returned team IDs with team-scoped actions.

List projects (`listProjects`)
:   List projects across the workspace, or set `teamId` to list projects for one team.

List cycles (`listCycles`)
:   List cycles for the required `teamId`. Use a returned cycle ID as `cycleId` when creating or updating an issue.

List workflow states (`listWorkflowStates`)
:   List workflow states for the required `teamId`.

List issue labels (`listIssueLabels`)
:   List issue labels for the required `teamId`.

List users (`listUsers`)
:   List workspace users, or set `teamId` to list members of one team. Set `includeDisabled` to include disabled users.

The list actions accept these pagination fields:

- `first` (optional): Number of records to return, from 1 through 100. The default is 50.
- `after` (optional): Cursor from `pageInfo.endCursor` in a previous response.
- `orderBy` (optional): `createdAt` or `updatedAt`. The default is `updatedAt`.

Each list response contains selected `nodes` and `pageInfo`. Continue paging only when `pageInfo.hasNextPage` is `true`; only those responses expose `pageInfo.endCursor`.

List issues (`listIssues`)
:   List issues with Relay pagination. The optional `filter` supports `teamId`, `projectId`, `assigneeId`, `stateId`, `labelIds`, `titleContains`, `priority`, and inclusive `createdAfter`, `createdBefore`, `updatedAfter`, and `updatedBefore` RFC 3339 timestamps. `priority` is 0 through 4. Set `archivedStatus` to `active` (default), `archived`, or `all`. Each issue includes readable team, workflow state, project, and assignee fields, plus cycle and parent references when present.

Get issue (`getIssue`)
:   Get one issue using a Linear UUID or human-readable identifier such as `ENG-42`. The response includes readable team, workflow state, project, and assignee fields, plus cycle and parent references when present.

Create issue (`createIssue`)
:   Create an issue. `teamId` and `title` are required. Optional fields are `description`, `assigneeId`, `projectId`, `cycleId`, `parentId`, `stateId`, `priority`, `dueDate`, and `labelIds`. Use `listCycles` to resolve `cycleId`. `dueDate` must be a valid `YYYY-MM-DD` calendar date. The returned issue includes readable team, workflow state, project, and assignee fields, plus cycle and parent references.

Update issue (`updateIssue`)
:   Update one issue. `id` and at least one change are required. You can update `title`, `description`, `assigneeId`, `projectId`, `cycleId`, `parentId`, `stateId`, `priority`, `dueDate`, and labels. Use `listCycles` to resolve `cycleId`. Omitted fields remain unchanged. Set nullable fields such as `description`, `assigneeId`, `projectId`, `cycleId`, `parentId`, and `dueDate` to `null` to clear them. The returned issue includes readable team, workflow state, project, and assignee fields, plus cycle and parent references, so a workflow can verify assignment or clearing. Moving an issue to another team is not supported by this connector version.

For labels, use one of these modes:

- `labelIds` replaces the complete label set. An empty array removes all labels.
- `addedLabelIds` and `removedLabelIds` change labels incrementally.

Do not combine `labelIds` with `addedLabelIds` or `removedLabelIds` in one update.

Create comment (`createComment`)
:   Add a Markdown comment. Both `issueId` and `body` are required.

Create attachment (`createAttachment`)
:   Link an existing HTTPS URL to an issue. `issueId`, `title`, and `url` are required. Optional `subtitle`, `iconUrl`, and metadata are supported. An `iconUrl` should point to a PNG or JPG no larger than 1 MB; Linear recommends 20x20 pixels. The connector validates that the URL uses HTTPS but does not fetch the icon or verify its format, size, or dimensions. Metadata values must be strings or numbers. This action links a URL; it does not upload file bytes. Linear updates the existing attachment when the same issue and URL are used again.

The list and get actions are exposed as Agent Builder tools. The create and update actions are not exposed as autonomous tools and remain unavailable until the planned Workflows activation.

## Connector networking configuration [linear-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings.

## Get API credentials [linear-api-credentials]

1. In Linear, open **Settings > Security & access**.
2. Select Read for reads. Broad Write permits all four mutation actions and was live-tested. If you do not need `updateIssue`, use Create issues for `createIssue` and `createAttachment`, and Create comments for `createComment`. Admin is not required.
3. Copy the key into the connector's **API key** field without a prefix.

Personal API keys act with the permissions of the user who created them. Store and rotate the key as a credential.

Refer to [Linear GraphQL getting started](https://linear.app/developers/graphql) for endpoint, personal API key, pagination, filtering, and error-handling details.
