/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const TimeWindowSchema = schema.object({
  unit: schema.oneOf(
    [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
    {
      defaultValue: 'm',
    }
  ),
  size: schema.number({
    defaultValue: 5,
  }),
});

const NumberOfChecksSchema = schema.object({
  numberOfChecks: schema.number({
    defaultValue: 5,
    min: 1,
    max: 100,
  }),
});

const StatusRuleConditionSchema = schema.object({
  groupBy: schema.maybe(
    schema.string({
      defaultValue: 'locationId',
    })
  ),
  downThreshold: schema.maybe(
    schema.number({
      defaultValue: 3,
    })
  ),
  locationsThreshold: schema.maybe(
    schema.number({
      defaultValue: 1,
    })
  ),
  window: schema.oneOf([
    schema.object({
      time: TimeWindowSchema,
    }),
    NumberOfChecksSchema,
  ]),
  includeRetests: schema.maybe(schema.boolean()),
  alertOnNoData: schema.maybe(schema.boolean()),
});

export const syntheticsMonitorStatusRuleParamsSchema = schema.object(
  {
    condition: schema.maybe(StatusRuleConditionSchema),
    monitorIds: schema.maybe(schema.arrayOf(schema.string())),
    locations: schema.maybe(schema.arrayOf(schema.string())),
    tags: schema.maybe(schema.arrayOf(schema.string())),
    monitorTypes: schema.maybe(schema.arrayOf(schema.string())),
    projects: schema.maybe(schema.arrayOf(schema.string())),
    kqlQuery: schema.maybe(schema.string()),
  },
  {
    meta: { description: 'The parameters for the rule.' },
  }
);

export type SyntheticsMonitorStatusRuleParams = TypeOf<
  typeof syntheticsMonitorStatusRuleParamsSchema
>;
export type TimeWindow = TypeOf<typeof TimeWindowSchema>;
export type StatusRuleCondition = TypeOf<typeof StatusRuleConditionSchema>;
