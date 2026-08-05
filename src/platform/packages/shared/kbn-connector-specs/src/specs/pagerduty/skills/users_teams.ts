/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';

export const usersTeamsSkillFile = buildSkill(({ bt, fence }) => ({
  id: 'users-teams',
  name: 'pagerduty-users-teams',
  description:
    'Search PagerDuty users by name or email, list or search teams, get team details, and confirm the authenticated connector identity.',
  content: `
**Connector:** Use ${bt}sml_search(query: "pagerduty", types: ["connector"])${bt} to find the connector. If one result, use it. If multiple, show the names and ask the user which to use. Substitute the chosen ID for ${bt}<connectorId>${bt} in all bash commands.

## When to Use

Use this skill when the user asks to:
- **Search for a user** by name or email
- **List or search teams** in PagerDuty
- **Get details on a specific team** by ID
- **Confirm which account** the PagerDuty connector is authenticated as

## Workflow

Always use ${bt}exec_tool${bt} piped to ${bt}jq${bt} so the fetch and parse happen in one round trip.
Refer to ${bt}./resources/list-users-teams.md${bt} for the exact bash commands.

### Search users — ${bt}listUsers${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name and email |
| ${bt}limit${bt} | Max results |

### List / search teams — ${bt}listTeams${bt}

| Param | Description |
|---|---|
| ${bt}query${bt} | Free-text search across name and description |
| ${bt}limit${bt} | Max results |

### Get a specific team by ID — ${bt}getTeam${bt}

Use ${bt}getTeam${bt} with ${bt}team_id${bt} (required). Returns id, name, and description.

### Confirm connector identity — ${bt}getUserData${bt}

No params required. Returns the authenticated user's id, name, email, role, and team memberships.

## Notes

- If the response is an empty array, tell the user no results matched their filters.
- If a sub-action returns an authorization error, the connector credentials are misconfigured — direct the user to Kibana → Stack Management → Connectors.
- Only include params the user actually specified — omit the rest entirely.
`.trim(),
  resources: [
    {
      name: 'list-users-teams',
      relativePath: './resources',
      content: `Search users and teams in PagerDuty, and confirm connector identity.

## Search users

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listUsers \\
  --args='{"params":{"query":"<name or email>","limit":20}}' \\
| jq '.response | [.[] | {id: .id, name: .name, email: .email, role: .role}]'
${fence}

## List / search teams

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction listTeams \\
  --args='{"params":{"limit":20}}' \\
| jq '.response | [.[] | {id: .id, name: .name, description: .description}]'
${fence}

## Get a specific team by ID

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction getTeam \\
  --args='{"params":{"team_id":"P123ABC"}}' \\
| jq '.response | {id: .id, name: .name, description: .description}'
${fence}

## Confirm connector identity

${fence}bash
exec_tool platform_core_execute_connector_sub_action \\
  --connectorId <connectorId> \\
  --subAction getUserData \\
  --args='{"params":{}}' \\
| jq '.response | {id: .id, name: .name, email: .email, role: .role, teams: [.teams[] | .summary]}'
${fence}`,
    },
  ],
}));
