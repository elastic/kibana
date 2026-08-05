/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';

export const escalationPoliciesSkillFile = buildSkill(({ bt, fence }) => ({
  id: 'escalation-policies',
  name: 'pagerduty-escalation-policies',
  description:
    'List or search PagerDuty escalation policies, and get full details on a specific policy — rules, delay minutes, targets, and services.',
  content: `
**Connector:** Use ${bt}sml_search(query: "pagerduty", types: ["connector"])${bt} to find the connector. If one result, use it. If multiple, show the names and ask the user which to use. Substitute the chosen ID for ${bt}<connectorId>${bt} in all bash commands.

## When to Use

Use this skill when the user asks to:
- List or search **escalation policies** by name or team
- Get **full details on a specific escalation policy** — rules, delay minutes, targets, services
- Understand **who gets paged and in what order** for a given service or team

## Workflow

Always use ${bt}exec_tool${bt} piped to ${bt}jq${bt} so the fetch and parse happen in one round trip.
Refer to ${bt}./resources/list-escalation-policies.md${bt} for the exact bash commands.

### List / search escalation policies — ${bt}listEscalationPolicies${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name/description |
| ${bt}limit${bt} | Max results |
| ${bt}user_ids${bt} | Filter by user IDs |
| ${bt}team_ids${bt} | Filter by team IDs |

### Get a specific policy by ID — ${bt}getEscalationPolicy${bt}

Use ${bt}getEscalationPolicy${bt} with ${bt}policy_id${bt} (required). Returns full escalation rules, delay minutes, targets, associated services, and teams.

## Notes

- If the response is an empty array, tell the user no policies matched their filters.
- If a sub-action returns an authorization error, the connector credentials are misconfigured — direct the user to Kibana → Stack Management → Connectors.
- Only include params the user actually specified — omit the rest entirely.
`.trim(),
  resources: [
    {
      name: 'list-escalation-policies',
      relativePath: './resources',
      content: `List and inspect PagerDuty escalation policies.

## List / search escalation policies

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

## Get full details on a specific policy

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction getEscalationPolicy \\
  --args='{"params":{"policy_id":"P123ABC"}}' \\
| jq '.response | {
    id:   .id,
    name: .name,
    escalation_rules: [.escalation_rules[] | {
      delay_minutes: .escalation_delay_in_minutes,
      targets: [.targets[] | {type: .type, summary: .summary}]
    }],
    services: [.services[] | .summary],
    teams:    [.teams[] | .summary]
  }'
${fence}`,
    },
  ],
}));
