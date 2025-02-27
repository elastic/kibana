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
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  errorGroupingKey: schema.maybe(schema.string()),
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type ErrorCountRuleParams = TypeOf<typeof errorCountParamsSchema>;
