/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { AlertRuleTriggerSchema, ManualTriggerSchema, ScheduledTriggerSchema } from './schema';

export interface TriggerDocumentation {
  details?: string;
  examples: string[];
}

export interface BaseTriggerDefinition {
  id: string;
  label: string;
  description: string;
  schema: z.ZodType;
  documentation: TriggerDocumentation;
}

export const builtInTriggerDefinitions: BaseTriggerDefinition[] = [
  {
    id: 'manual',
    label: 'Manual',
    description: 'Trigger a workflow manually via the UI or API',
    schema: ManualTriggerSchema,
    documentation: {
      examples: [
        `triggers:
  - type: manual`,
      ],
    },
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    description:
      'Run a workflow on a recurring schedule using a simple interval (e.g. every 5m) or an rrule for complex patterns (specific days, hours)',
    schema: ScheduledTriggerSchema,
    documentation: {
      details:
        'Supports two formats: simple interval (`every: "5m"`) for fixed-rate schedules, or `rrule` for calendar-based patterns with day-of-week, hour, and timezone control.',
      examples: [
        `triggers:
  - type: scheduled
    with:
      every: "5m"`,
        `triggers:
  - type: scheduled
    with:
      rrule:
        freq: WEEKLY
        interval: 1
        byweekday: [MO, WE, FR]
        byhour: [9]
        byminute: [0]
        tzid: America/New_York`,
      ],
    },
  },
  {
    id: 'alert',
    label: 'Alert',
    description:
      'Trigger a workflow when an alerting rule fires. Optionally filter by rule_id or rule_name',
    schema: AlertRuleTriggerSchema,
    documentation: {
      examples: [
        `triggers:
  - type: alert`,
        `triggers:
  - type: alert
    with:
      rule_name: "High CPU Usage"`,
      ],
    },
  },
];

const builtInTriggerDefinitionsMap = new Map(builtInTriggerDefinitions.map((t) => [t.id, t]));

export function getBuiltInTriggerDefinition(id: string): BaseTriggerDefinition | undefined {
  return builtInTriggerDefinitionsMap.get(id);
}
