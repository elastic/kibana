/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSkillResource } from '../../../connector_spec';

export const buildGithubResources = ({
  bt,
  fence,
}: {
  bt: string;
  fence: string;
}): ConnectorSkillResource[] => [
  {
    name: 'issues-pull-requests',
    relativePath: './resources',
    content: `
Search results are large, so always pipe through the ${bt}jq${bt} filters below.
Add ${bt}body${bt} back only when the user asks what an issue says; fetch it with ${bt}getIssue${bt} instead.

### Search issues — ${bt}searchIssues${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | GitHub search query. Always scope with ${bt}repo:owner/name${bt} (or ${bt}org:${bt}) and ${bt}is:issue${bt} |
| ${bt}sort${bt} | ${bt}created${bt} (default), ${bt}updated${bt}, ${bt}comments${bt}, ${bt}reactions${bt}, ${bt}interactions${bt} |
| ${bt}order${bt} | ${bt}desc${bt} (default) or ${bt}asc${bt} |
| ${bt}perPage${bt} | Results per page (max 100). Prefer 20 |
| ${bt}page${bt} | 1-based page number. Use when ${bt}total_count${bt} exceeds what was returned |

Useful query qualifiers: ${bt}repo:elastic/kibana${bt}, ${bt}is:open${bt} / ${bt}is:closed${bt},
${bt}label:"Team:agent-builder"${bt}, ${bt}author:<login>${bt}, ${bt}assignee:<login>${bt}, ${bt}no:assignee${bt},
${bt}mentions:<login>${bt}, ${bt}created:>2026-01-01${bt}, ${bt}updated:>2026-10-01${bt}, ${bt}in:title${bt}
plus free-text words. Quote label names that contain spaces or colons.

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction searchIssues \\
  --args='{"params":{"query":"repo:elastic/kibana is:issue is:open label:Team:agent-builder","perPage":20}}' \\
| jq '{total_count, incomplete_results, items: [.items[] | {
    repo:       (.repository_url | sub("https://api.github.com/repos/"; "")),
    number, title, state,
    author:     .user.login,
    assignees:  [.assignees[].login],
    labels:     [.labels[].name],
    type:       .type.name,
    parent:     (if .parent_issue_url then (.parent_issue_url | split("/") | .[-1]) else null end),
    comments, created_at, updated_at, closed_at,
    url:        .html_url
  } | with_entries(select(.value != null))]}'
${fence}

${bt}parent${bt} is the number of the parent (epic) issue, when there is one. ${bt}type${bt} is the issue
type (for example Story or Bug), when the repository uses them.

### Search pull requests — ${bt}searchPullRequests${bt}

Same params as ${bt}searchIssues${bt}. Scope with ${bt}is:pr${bt}; useful extras are ${bt}is:merged${bt},
${bt}is:draft${bt}, ${bt}review-requested:<login>${bt}, ${bt}reviewed-by:<login>${bt} and ${bt}head:<branch>${bt}.

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction searchPullRequests \\
  --args='{"params":{"query":"repo:elastic/kibana is:pr is:open author:<login>","perPage":20}}' \\
| jq '{total_count, incomplete_results, items: [.items[] | {
    repo:       (.repository_url | sub("https://api.github.com/repos/"; "")),
    number, title, state, draft,
    author:     .user.login,
    assignees:  [.assignees[].login],
    labels:     [.labels[].name],
    comments, created_at, updated_at, closed_at,
    merged_at:  .pull_request.merged_at,
    url:        .html_url
  } | with_entries(select(.value != null))]}'
${fence}

${bt}merged_at${bt} is only present on merged pull requests. A closed pull request without it was closed
unmerged.
`.trim(),
  },
  {
    name: 'list-issues-pull-requests',
    relativePath: './resources',
    content: `
Use this to browse one repository's issues or pull requests. To find them by label, author, text or
date, or across repositories, use the search resource instead.

Always pipe through the ${bt}jq${bt} filter below, which drops the bodies and keeps about 25% of the bytes. Fetch one
issue's body with ${bt}getIssue${bt} when the user asks what it says.

### List issues — ${bt}listIssues${bt}

| Param | Description |
|---|---|
| ${bt}owner${bt} / ${bt}repo${bt} | Repository owner and name |
| ${bt}state${bt} | ${bt}open${bt} (default), ${bt}closed${bt} or ${bt}all${bt} |
| ${bt}first${bt} | Has no effect: in testing a page was always 30 issues, whatever ${bt}first${bt} was. ${bt}perPage${bt} is not accepted either |
| ${bt}after${bt} | Cursor for the next page: the ${bt}endCursor${bt} from the previous response |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listIssues \\
  --args='{"params":{"owner":"elastic","repo":"kibana","state":"open"}}' \\
| jq '{totalCount, hasNextPage: .pageInfo.hasNextPage, endCursor: .pageInfo.endCursor, issues: [.issues[] | {
    number, title, state,
    author:    .user.login,
    assignees, labels,
    comments:  (.comments // 0),
    created_at, updated_at
  }]}'
${fence}

${bt}state${bt} comes back uppercase (${bt}OPEN${bt}, ${bt}CLOSED${bt}). ${bt}totalCount${bt} is the number of matching issues
in the repository, not the page size. While ${bt}hasNextPage${bt} is true, call again with
${bt}after${bt} set to ${bt}endCursor${bt}.

### List pull requests — ${bt}listPullRequests${bt}

| Param | Description |
|---|---|
| ${bt}owner${bt} / ${bt}repo${bt} | Repository owner and name |
| ${bt}state${bt} | ${bt}open${bt} (default), ${bt}closed${bt} or ${bt}all${bt} |

Use the script below to manage get just the relevant fields.

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listPullRequests \\
  --args='{"params":{"owner":"elastic","repo":"connectors","state":"open"}}' \\
| jq '[.[] | {
    title, state,
    draft:   (if .draft then true else null end),
    merged:  (if .merged then true else null end),
    author:  .user.login,
    labels,
    head:    .head.ref,
    base:    .base.ref,
    created_at, updated_at,
    url:     .html_url
  } | with_entries(select(.value != null))]'
${fence}

${bt}state${bt} is lowercase here (${bt}open${bt}), unlike ${bt}listIssues${bt}. ${bt}draft${bt} and ${bt}merged${bt} only appear when true; absent
means false. ${bt}base${bt} is the target branch and ${bt}head${bt} the source branch. The pull request number is the last part of
${bt}url${bt}.
`.trim(),
  },
];
