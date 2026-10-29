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

export const transformHealthRuleParamsSchema = schema.object({
  includeTransforms: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
  excludeTransforms: schema.nullable(
    schema.arrayOf(schema.string({ maxLength: 1000 }), { defaultValue: [], maxSize: 1000 })
  ),
  testsConfig: schema.nullable(
    schema.object({
      notStarted: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
      errorMessages: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: false }),
        })
      ),
      healthCheck: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
    })
  ),
});

export type TransformHealthRuleParams = TypeOf<typeof transformHealthRuleParamsSchema>;
