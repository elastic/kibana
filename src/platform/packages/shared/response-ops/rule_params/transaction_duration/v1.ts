/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { searchConfigurationSchema } from '../common/search_configuration_schema';

export enum AggregationType {
  Avg = 'avg',
  P95 = '95th',
  P99 = '99th',
}

export const transactionDurationParamsSchema = schema.object({
  /**
   * Filter the rule to apply to a specific service.
   */
  serviceName: schema.maybe(schema.string()),
  /**
   * Filter the rule to apply to a specific transaction type.
   */
  transactionType: schema.maybe(schema.string()),
  /**
   * Filter the rule to apply to a specific transaction name.
   */
  transactionName: schema.maybe(schema.string()),
  /**
   * The size of the time window (in `windowUnit` units), which determines how far back to search for documents.
   * Generally it should be a value higher than the rule check interval to avoid gaps in detection.
   */
  windowSize: schema.number(),
  /**
   * The type of units for the time window.
   * For example: minutes, hours, or days.
   */
  windowUnit: schema.string(),
  /**
   * The latency threshold value.
   */
  threshold: schema.number(),
  /**
   * The type of aggregation to perform.
   */
  aggregationType: schema.oneOf([
    schema.literal(AggregationType.Avg),
    schema.literal(AggregationType.P95),
    schema.literal(AggregationType.P99),
  ]),
  /**
   * Filter the rule to apply to a specific environment.
   */
  environment: schema.string(),
  /**
   * Perform a composite aggregation against the selected fields.
   * When any of these groups match the selected rule conditions, an alert is triggered per group.
   */
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  /**
   * A Kibana Query Language (KQL) expression thats limits the scope of alerts.
   */
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type TransactionDurationRuleParams = TypeOf<typeof transactionDurationParamsSchema>;
