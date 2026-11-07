/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSkillResource } from '../../../connector_spec';

export const buildPagerdutyResources = ({
  bt,
  fence,
}: {
  bt: string;
  fence: string;
}): ConnectorSkillResource[] => [
  {
    name: 'oncall',
    relativePath: './resources',
    content: `
### Who is on call for a named schedule

Run this workflow with ${bt}platform.core.execute_workflow${bt}: pass the YAML as ${bt}yaml${bt} (no need to save it first) and
${bt}connector_id${bt} plus the inputs below as ${bt}inputs${bt}, for example
${bt}{"connector_id":"<connectorId>","query":"primary"}${bt}. It finds the schedules whose name matches ${bt}query${bt}, then
returns who is on call for them, in one call. The result is ${bt}{ "response": [...], "truncated": bool, "matched_schedules": N }${bt}.

- ${bt}matched_schedules${bt} is how many schedules matched ${bt}query${bt}. If it is 0, nothing matched and ${bt}response${bt} is **not**
  filtered by schedule (it can list everyone), so tell the user no schedule matched instead of reporting it.
- Entries not driven by a schedule (for example a user targeted directly by a policy) have ${bt}schedule${bt}, ${bt}start${bt} and
  ${bt}end${bt} all null, and ${bt}escalation_policy${bt} carries only an ${bt}id${bt}.
- For "who is on call right now" without a schedule name, call ${bt}browseSchedules${bt} with ${bt}action: "list_oncalls"${bt} directly.

| Input | Description |
|---|---|
| ${bt}query${bt} | Schedule name to search for (required) |
| ${bt}limit${bt} | Max schedules to match (1-100, default 20) |
| ${bt}team_ids${bt} | Only schedules belonging to these team IDs |
| ${bt}kind${bt} | ${bt}legacy${bt} or ${bt}shift_based${bt}; omit for both |

${fence}yaml
name: PagerDuty Schedule On-Call
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        query:
          type: string
        limit:
          type: number
          default: 20
        team_ids:
          type: array
          items:
            type: string
        kind:
          type: string
      required:
        - connector_id
        - query

steps:
  - name: list_schedules
    type: pagerduty_mcp.browseSchedules
    connector-id: "{{ inputs.connector_id }}"
    with:
      request:
        action: list
        query: "\${{ inputs.query }}"
        limit: \${{ inputs.limit }}
        team_ids: \${{ inputs.team_ids }}
        kind: "\${{ inputs.kind }}"

  - name: list_oncalls
    type: pagerduty_mcp.browseSchedules
    connector-id: "{{ inputs.connector_id }}"
    with:
      request:
        action: list_oncalls
        earliest: true
        schedule_ids: >-
          \${{ steps.list_schedules.output.response | map: 'id' }}

  - name: result
    type: data.set
    with:
      response: \${{ steps.list_oncalls.output.response }}
      truncated: \${{ steps.list_oncalls.output.truncated }}
      matched_schedules: \${{ steps.list_schedules.output.response | size }}
${fence}
`.trim(),
  },
  {
    name: 'incidents-escalations',
    relativePath: './resources',
    content: `
All params go inside ${bt}request${bt}; ${bt}request.action${bt} selects the operation. Lists return
${bt}{ "response": [...], "truncated": bool }${bt}. If ${bt}truncated${bt} is true, page with ${bt}offset${bt}.
Responses are capped near 30 KB, so a large ${bt}limit${bt} can return fewer records than asked; prefer ${bt}limit${bt} 20.

## List/search incidents

Run this workflow with ${bt}platform.core.execute_workflow${bt}: pass the YAML as ${bt}yaml${bt} (no need to save it first) and
${bt}connector_id${bt} plus any params below as ${bt}inputs${bt}, for example
${bt}{"connector_id":"<connectorId>","statuses":["triggered","acknowledged"],"limit":20}${bt}. The result is
${bt}{ "response": [...], "truncated": bool }${bt} with compact incident records.

| Input | Description |
|---|---|
| ${bt}limit${bt} / ${bt}offset${bt} | Max results (1-100, default 20) / pagination offset |
| ${bt}statuses${bt} | ${bt}"triggered"${bt}, ${bt}"acknowledged"${bt}, ${bt}"resolved"${bt} |
| ${bt}service_ids${bt} | Limit to specific service IDs |
| ${bt}team_ids${bt} | Overrides your own teams when ${bt}request_scope${bt} is ${bt}"teams"${bt} |
| ${bt}since${bt} / ${bt}until${bt} | Date range, ISO 8601 |
| ${bt}urgencies${bt} | ${bt}"high"${bt}, ${bt}"low"${bt} |
| ${bt}priorities${bt} | Priority IDs (not names) |
| ${bt}request_scope${bt} | ${bt}"all"${bt} (default), ${bt}"teams"${bt}, ${bt}"assigned"${bt} (assigned to you) |

${fence}yaml
name: PagerDuty Incidents
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        limit:
          type: number
          default: 20
        offset:
          type: number
        statuses:
          type: array
          items:
            type: string
        service_ids:
          type: array
          items:
            type: string
        team_ids:
          type: array
          items:
            type: string
        since:
          type: string
        until:
          type: string
        urgencies:
          type: array
          items:
            type: string
        priorities:
          type: array
          items:
            type: string
        request_scope:
          type: string
      required:
        - connector_id

steps:
  - name: list_incidents
    type: pagerduty_mcp.browseIncidents
    connector-id: "{{ inputs.connector_id }}"
    with:
      request:
        action: list
        limit: \${{ inputs.limit }}
        offset: \${{ inputs.offset }}
        statuses: \${{ inputs.statuses }}
        service_ids: \${{ inputs.service_ids }}
        team_ids: \${{ inputs.team_ids }}
        since: "\${{ inputs.since }}"
        until: "\${{ inputs.until }}"
        urgencies: \${{ inputs.urgencies }}
        priorities: \${{ inputs.priorities }}
        request_scope: "\${{ inputs.request_scope }}"

  - name: transform_incidents
    type: data.map
    items: \${{ steps.list_incidents.output.response }}
    with:
      fields:
        id: \${{ item.id }}
        incident_number: \${{ item.incident_number }}
        title: \${{ item.title }}
        summary: \${{ item.summary }}
        status: \${{ item.status }}
        service:
          id: \${{ item.service.id }}
          summary: \${{ item.service.summary }}
        assignments:
          $map:
            items: \${{ item.assignments }}
            item: assignment
          at: \${{ assignment.at }}
          assignee:
            id: \${{ assignment.assignee.id }}
            summary: \${{ assignment.assignee.summary }}
        created_at: \${{ item.created_at }}
        updated_at: \${{ item.updated_at }}
        resolved_at: \${{ item.resolved_at }}

  - name: result
    type: data.set
    with:
      response: \${{ steps.transform_incidents.output }}
      truncated: \${{ steps.list_incidents.output.truncated }}
${fence}

## List/search escalation policies

Run this workflow the same way (${bt}platform.core.execute_workflow${bt}, ${bt}yaml${bt} + ${bt}inputs${bt}). The result is
${bt}{ "response": [...], "truncated": bool }${bt}; ${bt}teams${bt} and ${bt}services${bt} are lists of names, and are only present
when ${bt}include${bt} asks for them (the default does).

| Input | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name/description |
| ${bt}limit${bt} / ${bt}offset${bt} | Max results (1-100, default 20) / pagination offset |
| ${bt}user_ids${bt} | Filter by user IDs |
| ${bt}team_ids${bt} | Filter by team IDs |
| ${bt}include${bt} | ${bt}["services","teams"]${bt} (default) |

${fence}yaml
name: PagerDuty Escalation Policies
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        query:
          type: string
        limit:
          type: number
          default: 20
        offset:
          type: number
        user_ids:
          type: array
          items:
            type: string
        team_ids:
          type: array
          items:
            type: string
        include:
          type: array
          items:
            type: string
          default:
            - services
            - teams
      required:
        - connector_id

steps:
  - name: list_policies
    type: pagerduty_mcp.browseEscalationPolicies
    connector-id: "{{ inputs.connector_id }}"
    with:
      request:
        action: list
        query: "\${{ inputs.query }}"
        limit: \${{ inputs.limit }}
        offset: \${{ inputs.offset }}
        user_ids: \${{ inputs.user_ids }}
        team_ids: \${{ inputs.team_ids }}
        include: \${{ inputs.include }}

  - name: transform_policies
    type: data.map
    items: \${{ steps.list_policies.output.response }}
    with:
      fields:
        id: \${{ item.id }}
        name: \${{ item.name }}
        description: \${{ item.description }}
        teams:
          $map:
            items: \${{ item.teams }}
            item: team
          name: \${{ team.summary }}
        services:
          $map:
            items: \${{ item.services }}
            item: service
          name: \${{ service.summary }}

  - name: result
    type: data.set
    with:
      response: \${{ steps.transform_policies.output }}
      truncated: \${{ steps.list_policies.output.truncated }}
${fence}
`.trim(),
  },
  {
    name: 'users',
    relativePath: './resources',
    content: `
All params go inside ${bt}request${bt}; ${bt}request.action${bt} selects the operation. Lists return
${bt}{ "response": [...], "truncated": bool }${bt}. If ${bt}truncated${bt} is true, page with ${bt}offset${bt}.
Responses are capped near 30 KB, so a large ${bt}limit${bt} can return fewer records than asked; prefer ${bt}limit${bt} 20.

### Search users

Run this workflow the same way (${bt}platform.core.execute_workflow${bt}, ${bt}yaml${bt} + ${bt}inputs${bt}). The result is
${bt}{ "response": [...], "truncated": bool }${bt} with ${bt}id${bt}, ${bt}name${bt}, ${bt}email${bt} and ${bt}role${bt} for each user.

| Input | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name and email |
| ${bt}team_ids${bt} | Filter by team IDs |
| ${bt}limit${bt} / ${bt}offset${bt} | Max results (1-100, default 20) / pagination offset |

${fence}yaml
name: PagerDuty Search Users
triggers:
  - type: manual
    inputs:
      properties:
        connector_id:
          type: string
        query:
          type: string
        team_ids:
          type: array
          items:
            type: string
        limit:
          type: number
          default: 20
        offset:
          type: number
      required:
        - connector_id

steps:
  - name: list_users
    type: pagerduty_mcp.browseUsers
    connector-id: "{{ inputs.connector_id }}"
    with:
      request:
        action: list
        query: "\${{ inputs.query }}"
        team_ids: \${{ inputs.team_ids }}
        limit: \${{ inputs.limit }}
        offset: \${{ inputs.offset }}

  - name: transform_users
    type: data.map
    items: \${{ steps.list_users.output.response }}
    with:
      fields:
        id: \${{ item.id }}
        name: \${{ item.name }}
        email: \${{ item.email }}
        role: \${{ item.role }}

  - name: result
    type: data.set
    with:
      response: \${{ steps.transform_users.output }}
      truncated: \${{ steps.list_users.output.truncated }}
${fence}
`.trim(),
  },
];
