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
  serviceName: schema.maybe(schema.string()),
  transactionType: schema.maybe(schema.string()),
  transactionName: schema.maybe(schema.string()),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal(AggregationType.Avg),
    schema.literal(AggregationType.P95),
    schema.literal(AggregationType.P99),
  ]),
  environment: schema.string(),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type TransactionDurationRuleParams = TypeOf<typeof transactionDurationParamsSchema>;
