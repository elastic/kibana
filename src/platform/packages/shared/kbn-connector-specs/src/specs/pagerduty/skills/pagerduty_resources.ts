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
All params go inside ${bt}request${bt}; ${bt}request.action${bt} selects the operation. Lists return
${bt}{ "response": [...], "truncated": bool }${bt}. If ${bt}truncated${bt} is true, page with ${bt}offset${bt}.
Responses are capped near 30 KB, so a large ${bt}limit${bt} can return fewer records than asked; prefer ${bt}limit${bt} 20.

### Who is on call right now

Run ${bt}browseSchedules${bt} with ${bt}action: "list_oncalls"${bt}. ${bt}earliest${bt} defaults to true (one entry per policy, level and user):

| Param | Description |
|---|---|
| ${bt}limit${bt} / ${bt}offset${bt} | Max results (1-100) / pagination offset |
| ${bt}schedule_ids${bt} | Filter to specific schedule IDs |
| ${bt}escalation_policy_ids${bt} | Filter to specific escalation policy IDs |
| ${bt}user_ids${bt} | Filter to specific user IDs |
| ${bt}service_ids${bt} | Filter by the escalation policies of these services |
| ${bt}since${bt} | Start of on-call period, ISO 8601 (defaults to now) |
| ${bt}until${bt} | End of on-call period, ISO 8601 (at most 90 days ahead) |
| ${bt}earliest${bt} | ${bt}true${bt} = return only the earliest entry per policy, level and user |
| ${bt}time_zone${bt} | IANA time zone, e.g. ${bt}America/New_York${bt} |

Entries not driven by a schedule (for example a user targeted directly by a policy) have ${bt}schedule${bt}, ${bt}start${bt}
and ${bt}end${bt} all null, and ${bt}escalation_policy${bt} carries only an ${bt}id${bt}.

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseSchedules \\
  --args='{"params":{"request":{"action":"list_oncalls","earliest":true,"limit":20}}}'
${fence}

### Who is on call for a named schedule (two-step)

${bt}browseSchedules${bt} with ${bt}action: "list"${bt}:

| Param | Description |
|---|---|
| ${bt}query${bt} | Filter by schedule name |
| ${bt}limit${bt} / ${bt}offset${bt} | Max results / pagination offset |
| ${bt}team_ids${bt} | Filter to schedules belonging to these team IDs |
| ${bt}user_ids${bt} | Filter to schedules containing these user IDs (legacy schedules only) |
| ${bt}include${bt} | Legacy schedules only: ${bt}schedule_layers${bt}, ${bt}overrides_subschedule${bt}, ${bt}final_schedule${bt} |
| ${bt}kind${bt} | ${bt}legacy${bt} or ${bt}shift_based${bt}; omit to list both |

Step 1 — find the schedule ID:

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseSchedules \\
  --args='{"params":{"request":{"action":"list","query":"<schedule name>"}}}' \\
| jq '{truncated, response: [.response[] | {id, name, kind}]}'
${fence}

Step 2 — get on-call for that schedule ID:

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseSchedules \\
  --args='{"params":{"request":{"action":"list_oncalls","schedule_ids":["<id from step 1>"],"earliest":true}}}'
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

${bt}browseIncidents${bt} with ${bt}action: "list"${bt}:

| Param | Description |
|---|---|
| ${bt}limit${bt} / ${bt}offset${bt} | Max results (1-100) / pagination offset |
| ${bt}statuses${bt} | ${bt}"triggered"${bt}, ${bt}"acknowledged"${bt}, ${bt}"resolved"${bt} |
| ${bt}service_ids${bt} | Limit to specific service IDs |
| ${bt}team_ids${bt} | Overrides your own teams when ${bt}request_scope${bt} is ${bt}"teams"${bt} |
| ${bt}since${bt} / ${bt}until${bt} | Date range, ISO 8601 |
| ${bt}urgencies${bt} | ${bt}"high"${bt}, ${bt}"low"${bt} |
| ${bt}priorities${bt} | Priority IDs (not names) |
| ${bt}request_scope${bt} | ${bt}"all"${bt} (default), ${bt}"teams"${bt}, ${bt}"assigned"${bt} (assigned to you) |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseIncidents \\
  --args='{"params":{"request":{"action":"list","limit":20,"statuses":["triggered","acknowledged"]}}}' \\
| jq '{truncated, response: [.response[] | {
    id:              .id,
    incident_number: .incident_number,
    title:           .title,
    summary:         .summary,
    status:          .status,
    service: {
      id:         .service.id,
      summary:    .service.summary
    },
    assignments: [
      .assignments[] | {
        at: .at,
        assignee: {
          id:      .assignee.id,
          summary: .assignee.summary
        }
      }
    ],
    created_at:      .created_at,
    updated_at:      .updated_at,
    resolved_at:     .resolved_at
  }]}'
${fence}

## List/search escalation policies

${bt}browseEscalationPolicies${bt} with ${bt}action: "list"${bt}:

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name/description |
| ${bt}limit${bt} / ${bt}offset${bt} | Max results / pagination offset |
| ${bt}user_ids${bt} | Filter by user IDs |
| ${bt}team_ids${bt} | Filter by team IDs |
| ${bt}include${bt} | ${bt}["services","teams"]${bt}; ${bt}services${bt} and ${bt}teams${bt} are only returned when requested |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseEscalationPolicies \\
  --args='{"params":{"request":{"action":"list","limit":20,"include":["services","teams"]}}}' \\
| jq '{truncated, response: [.response[] | {
    id:          .id,
    name:        .name,
    description: .description,
    teams:       [(.teams // [])[] | .summary],
    services:    [(.services // [])[] | .summary]
  }]}'
${fence}
`.trim(),
  },
  {
    name: 'users-teams',
    relativePath: './resources',
    content: `
All params go inside ${bt}request${bt}; ${bt}request.action${bt} selects the operation. Lists return
${bt}{ "response": [...], "truncated": bool }${bt}. If ${bt}truncated${bt} is true, page with ${bt}offset${bt}.
Responses are capped near 30 KB, so a large ${bt}limit${bt} can return fewer records than asked; prefer ${bt}limit${bt} 20.

### Search users — ${bt}browseUsers${bt} with ${bt}action: "list"${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name and email |
| ${bt}team_ids${bt} | Filter by team IDs |
| ${bt}limit${bt} / ${bt}offset${bt} | Max results / pagination offset |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseUsers \\
  --args='{"params":{"request":{"action":"list","query":"<name or email>","limit":20}}}' \\
| jq '{truncated, response: [.response[] | {id, name, email, role}]}'
${fence}

The current user (the account that owns the API key) is ${bt}browseUsers${bt} with ${bt}action: "get"${bt} and no other fields.

### List / search teams — ${bt}browseTeams${bt} with ${bt}action: "list"${bt}

| Param | Description |
|---|---|
| ${bt}scope${bt} | ${bt}all${bt} or ${bt}my${bt} |
| ${bt}query${bt} | Free-text search across name and description |
| ${bt}limit${bt} / ${bt}offset${bt} | Max results / pagination offset |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction browseTeams \\
  --args='{"params":{"request":{"action":"list","limit":20}}}'
${fence}
`.trim(),
  },
];
