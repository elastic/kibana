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

export const errorCountParamsSchema = schema.object({
  /**
   * The time frame in which the errors must occur (in `windowUnit` units).
   * Generally it should be a value higher than the rule check interval to avoid gaps in detection.
   */
  windowSize: schema.number(),
  /**
   * The type of units for the time window: minutes, hours, or days.
   */
  windowUnit: schema.string(),
  /**
   * The number of errors, which is the threshold for alerts.
   */
  threshold: schema.number(),
  /**
   * Filter the errors coming from your application to apply the rule to a specific service.
   */
  serviceName: schema.maybe(schema.string()),
  /**
   * Filter the errors coming from your application to apply the rule to a specific environment.
   */
  environment: schema.string(),
  /**
   * Perform a composite aggregation against the selected fields.
   * When any of these groups match the selected rule conditions, an alert is triggered per group.
   */
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  /**
   * Filter the errors coming from your application to apply the rule to a specific error grouping key, which is a hash of the stack trace and other properties.
   */
  errorGroupingKey: schema.maybe(schema.string()),
  /**
   * A filter in Kibana Query Language (KQL) that limits the scope of the rule.
   */
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type ErrorCountRuleParams = TypeOf<typeof errorCountParamsSchema>;
