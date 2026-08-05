/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';

export const getIncidentsSkillFile = buildSkill(({ bt, fence }) => ({
  id: 'get-incidents',
  name: 'pagerduty-get-incidents',
  description:
    'Fetch, list, or get details on PagerDuty incidents — filtered by status, urgency, service, date, or assignment.',
  content: `
**Connector:** Use ${bt}sml_search(query: "pagerduty", types: ["connector"])${bt} to find the connector. If one result, use it. If multiple, show the names and ask the user which to use. Substitute the chosen ID for ${bt}<connectorId>${bt} in all bash commands.

## When to Use

Use this skill when the user asks to:
- Fetch, list, show, or get PagerDuty **incidents** — open, triggered, acknowledged, resolved, filtered by urgency/service/date
- Get details on a **specific incident** by ID

## Workflow

Always use ${bt}exec_tool${bt} piped to ${bt}jq${bt} so the fetch and parse happen in one round trip.
Refer to ${bt}./resources/list-incidents.md${bt} for the exact bash commands.

### List incidents — ${bt}listIncidents${bt}

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

### Get a specific incident by ID — ${bt}getIncident${bt}

Use ${bt}getIncident${bt} with ${bt}incident_id${bt} (required). Returns id, summary, status, urgency, service, current assignments, and timestamps.

## Notes

- If the response is an empty array, tell the user no incidents matched their filters.
- If a sub-action returns an authorization error, the connector credentials are misconfigured — direct the user to Kibana → Stack Management → Connectors.
- Only include params the user actually specified — omit the rest entirely.
`.trim(),
  resources: [
    {
      name: 'list-incidents',
      relativePath: './resources',
      content: `# list-incidents.md

Fetch and parse PagerDuty incidents in one bash call.

Adjust ${bt}params${bt} to match the user's filters — omit any key not specified.

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

To fetch a single incident by ID:

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction getIncident \\
  --args='{"params":{"incident_id":"Q1A2B3C4D5"}}' \\
| jq '.response | {
    id:          .id,
    summary:     .summary,
    status:      .status,
    urgency:     .urgency,
    service:     .service.summary,
    assignments: [.assignments[] | .assignee.summary],
    created_at:  .created_at,
    updated_at:  .updated_at
  }'
${fence}`,
    },
  ],
}));
