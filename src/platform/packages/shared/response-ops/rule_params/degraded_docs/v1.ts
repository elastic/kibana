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
  index: schema.string({ maxLength: 10000 }),
});

export const degradedDocsParamsSchema = schema.object({
  timeUnit: schema.string({ maxLength: 64 }),
  timeSize: schema.number(),
  threshold: schema.arrayOf(schema.number(), { maxSize: 2 }),
  comparator: oneOfLiterals(comparators),
  groupBy: schema.maybe(schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 100 })),
  searchConfiguration: searchConfigSchema,
});

export type DegradedDocsRuleParams = TypeOf<typeof degradedDocsParamsSchema>;
