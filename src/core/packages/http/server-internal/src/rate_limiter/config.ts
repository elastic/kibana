/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const rateLimiterConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  elu: schema.conditional(
    schema.siblingRef('enabled'),
    false,
    schema.never(),
    schema.number({ min: 0, max: 1 })
  ),
  term: schema.conditional(
    schema.siblingRef('enabled'),
    false,
    schema.never(),
    schema.oneOf([schema.literal('short'), schema.literal('medium'), schema.literal('long')], {
      defaultValue: 'long',
    })
  ),
});

export type RateLimiterConfig = TypeOf<typeof rateLimiterConfigSchema>;
