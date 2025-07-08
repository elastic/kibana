/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { oneOfLiterals } from '../common/utils';

const comparators = Object.values(COMPARATORS);

const searchConfigSchema = schema.object({
  index: schema.string(),
});

export const degradedDocsParamsSchema = schema.object({
  timeUnit: schema.string(),
  timeSize: schema.number(),
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(comparators),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  searchConfiguration: searchConfigSchema,
});

export type DegradedDocsRuleParams = TypeOf<typeof degradedDocsParamsSchema>;
