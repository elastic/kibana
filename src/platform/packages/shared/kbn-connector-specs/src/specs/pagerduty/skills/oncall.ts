/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';

export const oncallSkillFile = buildSkill(({ bt, fence }) => ({
  id: 'oncall',
  name: 'pagerduty-oncall',
  description:
    'Find who is on call right now, look up schedules by name, and get full schedule details using PagerDuty.',
  content: `
**Connector:** Use ${bt}sml_search(query: "pagerduty", types: ["connector"])${bt} to find the connector. If one result, use it. If multiple, show the names and ask the user which to use. Substitute the chosen ID for ${bt}<connectorId>${bt} in all bash commands.

## When to Use

Use this skill when the user asks to:
- Find out **who is on call** right now (across all policies, or for a named schedule)
- Look up a **schedule by name** to get its ID or rotation details
- Get **full details on a specific schedule** by ID

## Workflow

Always use ${bt}exec_tool${bt} piped to ${bt}jq${bt} so the fetch and parse happen in one round trip.
Refer to ${bt}./resources/list-oncalls.md${bt} for the exact bash commands.

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

### Who is on call for a named schedule (two-step)

1. Run ${bt}listSchedules${bt} with ${bt}query${bt} set to the schedule name to get the schedule ID.
2. Run ${bt}listOncalls${bt} with ${bt}schedule_ids${bt} set to that ID and ${bt}earliest: true${bt}.

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name/description |
| ${bt}limit${bt} | Max results |
| ${bt}team_ids${bt} | Filter to schedules belonging to these team IDs |
| ${bt}user_ids${bt} | Filter to schedules containing these user IDs |
| ${bt}include${bt} | Related resources: ${bt}schedule_layers${bt}, ${bt}overrides_subschedule${bt}, ${bt}final_schedule${bt} |

### Get full schedule details by ID

Use ${bt}getSchedule${bt} with ${bt}schedule_id${bt} (required).

## Notes

- If the response is an empty array, tell the user no results matched their filters.
- If a sub-action returns an authorization error, the connector credentials are misconfigured — direct the user to Kibana → Stack Management → Connectors.
- Only include params the user actually specified — omit the rest entirely.
`.trim(),
  resources: [
    {
      name: 'list-oncalls',
      relativePath: './resources',
      content: `Find who is currently on call.

## Who is on call right now (no specific schedule)

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

## Who is on call for a named schedule (two-step)

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

## Get full schedule details by ID

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction getSchedule \\
  --args='{"params":{"schedule_id":"P123ABC"}}' \\
| jq '.response | {
    id:        .id,
    name:      .name,
    time_zone: .time_zone,
    users:     [.users[] | .summary]
  }'
${fence}`,
    },
  ],
}));
