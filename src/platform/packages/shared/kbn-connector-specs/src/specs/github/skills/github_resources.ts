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
Run each workflow below with ${bt}platform.core.execute_workflow${bt}: pass the YAML as ${bt}yaml${bt} (it does not need to be
saved first) and ${bt}connector_id${bt} plus the inputs from its table as ${bt}inputs${bt}. Results are trimmed to what is useful (no
bodies, avatars, or URL clutter). To read an issue's body, use the connector's ${bt}getIssue${bt} action.

### Search issues — ${bt}searchIssues${bt}

Example ${bt}inputs${bt}: ${bt}{"connector_id":"<connectorId>","query":"repo:elastic/kibana is:issue is:open label:Team:agent-builder"}${bt}.
The result is ${bt}{ "total_count": N, "incomplete_results": bool, "items": [...] }${bt}. ${bt}parent${bt} (the parent or epic issue
number), ${bt}type${bt} (for example Story or Bug) and ${bt}closed_at${bt} are only present when set.

| Input | Description |
|---|---|
| ${bt}query${bt} | GitHub search query (required). Always scope with ${bt}repo:owner/name${bt} (or ${bt}org:${bt}) and ${bt}is:issue${bt} |
| ${bt}sort${bt} | ${bt}created${bt} (default), ${bt}updated${bt}, ${bt}comments${bt}, ${bt}reactions${bt}, ${bt}interactions${bt} |
| ${bt}order${bt} | ${bt}desc${bt} (default) or ${bt}asc${bt} |
| ${bt}perPage${bt} | Results per page (max 100, default 20) |
| ${bt}page${bt} | 1-based page number. Use when ${bt}total_count${bt} exceeds what was returned |

Useful query qualifiers: ${bt}repo:elastic/kibana${bt}, ${bt}is:open${bt} / ${bt}is:closed${bt},
${bt}label:"Team:agent-builder"${bt}, ${bt}author:<login>${bt}, ${bt}assignee:<login>${bt}, ${bt}no:assignee${bt},
${bt}mentions:<login>${bt}, ${bt}created:>2026-01-01${bt}, ${bt}updated:>2026-10-01${bt}, ${bt}in:title${bt}
plus free-text words. Quote label names that contain spaces or colons.

${fence}yaml
name: GitHub Search Issues
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        query:
          type: string
        sort:
          type: string
        order:
          type: string
        perPage:
          type: number
          default: 20
        page:
          type: number
      required:
        - connector_id
        - query

steps:
  - name: search_issues
    type: github.searchIssues
    connector-id: "{{ inputs.connector_id }}"
    with:
      query: "\${{ inputs.query }}"
      sort: "\${{ inputs.sort }}"
      order: "\${{ inputs.order }}"
      perPage: \${{ inputs.perPage }}
      page: \${{ inputs.page }}

  - name: trim_issues
    type: data.map
    items: \${{ steps.search_issues.output.items }}
    with:
      fields:
        number: \${{ item.number }}
        title: \${{ item.title }}
        state: \${{ item.state }}
        author: \${{ item.user.login }}
        assignees: >-
          \${{ item.assignees | map: 'login' }}
        labels: >-
          \${{ item.labels | map: 'name' }}
        type: \${{ item.type.name }}
        parent: >-
          \${{ item.parent_issue_url | split: '/' | last }}
        comments: \${{ item.comments }}
        created_at: \${{ item.created_at }}
        updated_at: \${{ item.updated_at }}
        closed_at: \${{ item.closed_at }}
        url: \${{ item.html_url }}

  - name: result
    type: data.set
    with:
      total_count: \${{ steps.search_issues.output.total_count }}
      incomplete_results: \${{ steps.search_issues.output.incomplete_results }}
      items: \${{ steps.trim_issues.output }}
${fence}

### Search pull requests — ${bt}searchPullRequests${bt}

Same inputs as ${bt}searchIssues${bt}, but scope the query with ${bt}is:pr${bt}; useful extras are ${bt}is:merged${bt}, ${bt}is:draft${bt},
${bt}review-requested:<login>${bt}, ${bt}reviewed-by:<login>${bt} and ${bt}head:<branch>${bt}. The result has the same envelope.
${bt}merged_at${bt} is only present on merged pull requests; a closed pull request without it was closed unmerged.

${fence}yaml
name: GitHub Search Pull Requests
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        query:
          type: string
        sort:
          type: string
        order:
          type: string
        perPage:
          type: number
          default: 20
        page:
          type: number
      required:
        - connector_id
        - query

steps:
  - name: search_pull_requests
    type: github.searchPullRequests
    connector-id: "{{ inputs.connector_id }}"
    with:
      query: "\${{ inputs.query }}"
      sort: "\${{ inputs.sort }}"
      order: "\${{ inputs.order }}"
      perPage: \${{ inputs.perPage }}
      page: \${{ inputs.page }}

  - name: trim_pull_requests
    type: data.map
    items: \${{ steps.search_pull_requests.output.items }}
    with:
      fields:
        number: \${{ item.number }}
        title: \${{ item.title }}
        state: \${{ item.state }}
        draft: \${{ item.draft }}
        author: \${{ item.user.login }}
        assignees: >-
          \${{ item.assignees | map: 'login' }}
        labels: >-
          \${{ item.labels | map: 'name' }}
        comments: \${{ item.comments }}
        created_at: \${{ item.created_at }}
        updated_at: \${{ item.updated_at }}
        closed_at: \${{ item.closed_at }}
        merged_at: \${{ item.pull_request.merged_at }}
        url: \${{ item.html_url }}

  - name: result
    type: data.set
    with:
      total_count: \${{ steps.search_pull_requests.output.total_count }}
      incomplete_results: \${{ steps.search_pull_requests.output.incomplete_results }}
      items: \${{ steps.trim_pull_requests.output }}
${fence}
`.trim(),
  },
  {
    name: 'list-issues-pull-requests',
    relativePath: './resources',
    content: `
Use these to browse one repository's issues or pull requests. To find them by label, author, text or date, or
across repositories, use the search resource instead.

Run each workflow below with ${bt}platform.core.execute_workflow${bt}: pass the YAML as ${bt}yaml${bt} (it does not need to be
saved first) and ${bt}connector_id${bt} plus the inputs from its table as ${bt}inputs${bt}. Results are trimmed to what is useful (no
bodies, avatars, or URL clutter). To read an issue's body, use the connector's ${bt}getIssue${bt} action.

### List issues — ${bt}listIssues${bt}

Example ${bt}inputs${bt}: ${bt}{"connector_id":"<connectorId>","owner":"elastic","repo":"kibana"}${bt}.
The result is ${bt}{ "totalCount": N, "hasNextPage": bool, "endCursor": "...", "issues": [...] }${bt}. A page is about 30
issues and its size cannot be changed. While ${bt}hasNextPage${bt} is true, run it again with ${bt}after${bt} set to ${bt}endCursor${bt}.
${bt}state${bt} comes back uppercase (${bt}OPEN${bt}, ${bt}CLOSED${bt}), and ${bt}comments${bt} is absent when it is 0.

| Input | Description |
|---|---|
| ${bt}owner${bt} / ${bt}repo${bt} | Repository owner and name (required) |
| ${bt}state${bt} | ${bt}open${bt} (default), ${bt}closed${bt} or ${bt}all${bt} |
| ${bt}after${bt} | Cursor for the next page: the ${bt}endCursor${bt} from the previous result |

${fence}yaml
name: GitHub List Issues
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        owner:
          type: string
        repo:
          type: string
        state:
          type: string
          default: open
        after:
          type: string
      required:
        - connector_id
        - owner
        - repo

steps:
  - name: list_issues
    type: github.listIssues
    connector-id: "{{ inputs.connector_id }}"
    with:
      owner: "\${{ inputs.owner }}"
      repo: "\${{ inputs.repo }}"
      state: "\${{ inputs.state }}"
      after: "\${{ inputs.after }}"

  - name: trim_issues
    type: data.map
    items: \${{ steps.list_issues.output.issues }}
    with:
      fields:
        number: \${{ item.number }}
        title: \${{ item.title }}
        state: \${{ item.state }}
        author: \${{ item.user.login }}
        assignees: \${{ item.assignees }}
        labels: \${{ item.labels }}
        comments: \${{ item.comments }}
        created_at: \${{ item.created_at }}
        updated_at: \${{ item.updated_at }}

  - name: result
    type: data.set
    with:
      totalCount: \${{ steps.list_issues.output.totalCount }}
      hasNextPage: \${{ steps.list_issues.output.pageInfo.hasNextPage }}
      endCursor: \${{ steps.list_issues.output.pageInfo.endCursor }}
      issues: \${{ steps.trim_issues.output }}
${fence}

### List pull requests — ${bt}listPullRequests${bt}

Example ${bt}inputs${bt}: ${bt}{"connector_id":"<connectorId>","owner":"elastic","repo":"connectors"}${bt}.
The result is a list of pull requests with no paging fields: it returns about 30 at most and cannot be paged, so for a
filtered or older set use ${bt}searchPullRequests${bt} from the search resource. ${bt}state${bt} is lowercase here (${bt}open${bt}). ${bt}head${bt} is
the source branch and ${bt}base${bt} the target branch. The pull request number is the last part of ${bt}url${bt}.

| Input | Description |
|---|---|
| ${bt}owner${bt} / ${bt}repo${bt} | Repository owner and name (required) |
| ${bt}state${bt} | ${bt}open${bt} (default), ${bt}closed${bt} or ${bt}all${bt} |

${fence}yaml
name: GitHub List Pull Requests
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        owner:
          type: string
        repo:
          type: string
        state:
          type: string
          default: open
      required:
        - connector_id
        - owner
        - repo

steps:
  - name: list_pull_requests
    type: github.listPullRequests
    connector-id: "{{ inputs.connector_id }}"
    with:
      owner: "\${{ inputs.owner }}"
      repo: "\${{ inputs.repo }}"
      state: "\${{ inputs.state }}"

  - name: trim_pull_requests
    type: data.map
    items: \${{ steps.list_pull_requests.output }}
    with:
      fields:
        title: \${{ item.title }}
        state: \${{ item.state }}
        draft: \${{ item.draft }}
        merged: \${{ item.merged }}
        author: \${{ item.user.login }}
        labels: \${{ item.labels }}
        head: \${{ item.head.ref }}
        base: \${{ item.base.ref }}
        created_at: \${{ item.created_at }}
        updated_at: \${{ item.updated_at }}
        url: \${{ item.html_url }}
${fence}
`.trim(),
  },
];
