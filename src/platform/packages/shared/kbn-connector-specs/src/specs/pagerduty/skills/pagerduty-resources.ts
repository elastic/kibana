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
### Who is on call right now

Run ${bt}listOncalls${bt} with ${bt}earliest: true${bt} to get one entry per user+policy:

| Param | Description |
|---|---|
| ${bt}limit${bt} | Max results (default 20) |
| ${bt}schedule_ids${bt} | Filter to specific schedule IDs |
| ${bt}escalation_policy_ids${bt} | Filter to specific escalation policy IDs |
| ${bt}user_ids${bt} | Filter to specific user IDs |
| ${bt}since${bt} | Start of on-call period, ISO 8601 |
| ${bt}until${bt} | End of on-call period, ISO 8601 |
| ${bt}earliest${bt} | ${bt}true${bt} = return only the first entry per user+policy (recommended) |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listOncalls \\
  --args='{"params":{"earliest":true,"limit":20}}' \\
| jq '.response | [.[] | {
    user:  {
        summary:  .user.summary,
        id: .user.id
    },
    escalation_level:    .escalation_level,
    escalation_policy: .escalation_policy.summary,
    schedule:  {
        summary: .schedule.summary,
        id:             .schedule.id
    },
    start:             .start,
    end:               .end
  }]'
${fence}

### Who is on call for a named schedule (two-step)

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name/description |
| ${bt}limit${bt} | Max results |
| ${bt}team_ids${bt} | Filter to schedules belonging to these team IDs |
| ${bt}user_ids${bt} | Filter to schedules containing these user IDs |
| ${bt}include${bt} | Related resources: ${bt}schedule_layers${bt}, ${bt}overrides_subschedule${bt}, ${bt}final_schedule${bt} |

Step 1 — find the schedule ID:

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listSchedules \\
  --args='{"params":{"query":"<schedule name>"}}' \\
| jq '.response | [.[] | {id: .id, name: .name}]'
${fence}

Step 2 — get on-call for that schedule ID:

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listOncalls \\
  --args='{"params":{"schedule_ids":["<id from step 1>"],"earliest":true}}' \\
| jq '.response | [.[] | {
    user:     .user.summary,
    schedule: .schedule.summary,
    start:    .start,
    end:      .end
  }]'
${fence}
`.trim(),
  },
  {
    name: 'incidents-escalations',
    relativePath: './resources',
    content: `
## List/search incidents

| Param | Description |
|---|---|
| ${bt}limit${bt} | Max to return (default 25, max 1000) |
| ${bt}status${bt} | ${bt}"triggered"${bt}, ${bt}"acknowledged"${bt}, ${bt}"resolved"${bt} |
| ${bt}service_ids${bt} | Limit to specific service IDs |
| ${bt}user_ids${bt} | Assigned to these user IDs (use with ${bt}request_scope: "assigned"${bt}) |
| ${bt}since${bt} / ${bt}until${bt} | Date range, ISO 8601 |
| ${bt}urgencies${bt} | ${bt}"high"${bt}, ${bt}"low"${bt} |
| ${bt}request_scope${bt} | ${bt}"all"${bt} (default), ${bt}"teams"${bt}, ${bt}"assigned"${bt} |
| ${bt}sort_by${bt} | e.g. ${bt}["created_at:desc"]${bt}. Fields: ${bt}incident_number${bt}, ${bt}created_at${bt}, ${bt}resolved_at${bt}, ${bt}urgency${bt} |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listIncidents \\
  --args='{"params":{"limit":50,"status":["triggered","acknowledged"],"sort_by":["created_at:desc"]}}' \\
| jq '.response | [.[] | {
    id:           .id,
    summary:      .summary,
    urgency:      .urgency,
    status:       .status,
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
    created_at:   .created_at,
    updated_at:   .updated_at,
    incident_key: .incident_key
  }]'
${fence}

## List/search escalation policies

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name/description |
| ${bt}limit${bt} | Max results |
| ${bt}user_ids${bt} | Filter by user IDs |
| ${bt}team_ids${bt} | Filter by team IDs |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listEscalationPolicies \\
  --args='{"params":{"limit":20}}' \\
| jq '.response | [.[] | {
    id:          .id,
    name:        .name,
    description: .description,
    teams:       [.teams[] | .summary],
    services:    [.services[] | .summary]
  }]'
${fence}
`.trim(),
  },
  {
    name: 'users-teams',
    relativePath: './resources',
    content: `

### Search users — ${bt}listUsers${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name and email |
| ${bt}limit${bt} | Max results |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listUsers \\
  --args='{"params":{"query":"<name or email>","limit":20}}' \\
| jq '.response | [.[] | {id, name, email, role}]'
${fence}

### List / search teams — ${bt}listTeams${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name and description |
| ${bt}limit${bt} | Max results |

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listTeams \\
  --args='{"params":{"limit":20}}' \\
| jq '.response | [.[] | {id: .id, name: .name, description: .description}]'
${fence}
`.trim(),
  },
];
