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
import { searchConfigurationSchema } from '../common/search_configuration_schema';

export enum AggregationType {
  Avg = 'avg',
  P95 = '95th',
  P99 = '99th',
}

export const transactionDurationParamsSchema = schema.object({
  serviceName: schema.maybe(
    schema.string({ meta: { description: 'Filter the rule to apply to a specific service.' } })
  ),
  transactionType: schema.maybe(
    schema.string({
      meta: { description: 'Filter the rule to apply to a specific transaction type.' },
    })
  ),
  transactionName: schema.maybe(
    schema.string({
      meta: { description: 'Filter the rule to apply to a specific transaction name.' },
    })
  ),
  windowSize: schema.number({
    meta: {
      description:
        'The size of the time window (in `windowUnit` units), which determines how far back to search for documents. Generally it should be a value higher than the rule check interval to avoid gaps in detection.',
    },
  }),
  windowUnit: schema.string({
    meta: {
      description: 'The type of units for the time window. For example: minutes, hours, or days.',
    },
  }),
  threshold: schema.number({ meta: { description: 'The latency threshold value.' } }),
  aggregationType: schema.oneOf(
    [
      schema.literal(AggregationType.Avg),
      schema.literal(AggregationType.P95),
      schema.literal(AggregationType.P99),
    ],
    { meta: { description: 'The type of aggregation to perform.' } }
  ),
  environment: schema.string({
    meta: { description: 'Filter the rule to apply to a specific environment.' },
  }),
  groupBy: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: {
          description:
            'Perform a composite aggregation against the selected fields. When any of these groups match the selected rule conditions, an alert is triggered per group.',
        },
      })
    )
  ),
  useKqlFilter: schema.maybe(
    schema.boolean({
      meta: {
        description: 'A Kibana Query Language (KQL) expression thats limits the scope of alerts.',
      },
    })
  ),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type TransactionDurationRuleParams = TypeOf<typeof transactionDurationParamsSchema>;
