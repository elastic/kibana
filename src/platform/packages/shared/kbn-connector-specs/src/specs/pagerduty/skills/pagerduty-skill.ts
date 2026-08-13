/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';
import { buildPagerdutyResources } from './pagerduty-resources';

export const pagerdutySkillFile = buildSkill(({ bt, fence }) => ({
  id: 'pagerduty',
  name: 'pagerduty',
  description:
    'Access PagerDuty incidents, on-call assignments, schedules, escalation policies, users, and teams.',
  content: `
**Connector:** Infer the connector from context. If none available, query based on type. Substitute
the chosen ID for ${bt}<connectorId>${bt} in all commands.

In all attached files, running means to execute an action on the connector.  The params table represents
the set of all possible options, adjust as needed to fit the user's intent.

| Intent | Resource |
|---|---|
| Get schedule information, including who is on call | ${bt}./resources/oncall.md${bt} |
| List incidents and escalation policies | ${bt}./resources/incidents-escalations.md${bt} |
| Lookup users or teams | ${bt}./resources/users-teams.md${bt} |
`.trim(),
  resources: buildPagerdutyResources({ bt, fence }),
}));
