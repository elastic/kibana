/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';
import { buildPagerdutyResources } from './pagerduty_resources';

export const pagerdutySkillFile = buildSkill(({ bt, fence }) => ({
  id: 'pagerduty',
  name: 'connector-pagerduty',
  description:
    'Look up who is on call for a named PagerDuty schedule, and list incidents, escalation policies, and users, with compact results.',
  content: `
**Connector:** Call ${bt}list_connectors${bt} and use the ${bt}id${bt} of the connector of type ${bt}.pagerduty_mcp${bt} (PagerDuty) as
${bt}connector_id${bt}. If several match, ask the user which one to use.

Each attached file contains a workflow. To run one, call ${bt}platform.core.execute_workflow${bt} with the workflow YAML as
${bt}yaml${bt} (it does not need to be saved first) and ${bt}connector_id${bt} plus any inputs from the file's table as ${bt}inputs${bt}.
The inputs table represents all possible options; use only what the user's request needs. Workflows trim the
response to what is useful, so prefer them over calling the connector directly for these lookups.

| Intent | Resource |
|---|---|
| Who is on call for a named schedule | ${bt}./resources/oncall.md${bt} |
| List incidents and escalation policies | ${bt}./resources/incidents-escalations.md${bt} |
| Look up users | ${bt}./resources/users.md${bt} |

For anything else (who is on call right now, teams, creating or updating incidents), use the connector's own
guide and actions.
`.trim(),
  resources: buildPagerdutyResources({ bt, fence }),
}));
