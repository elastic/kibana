/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const rangeValueSchema = z.union([z.string(), z.number()]);

const rangeKeySchema = z
  .object({
    type: z.literal('range_key'),
    from: rangeValueSchema,
    to: rangeValueSchema,
    ranges: z
      .array(
        z
          .object({
            from: rangeValueSchema,
            to: rangeValueSchema,
            label: z.string(),
          })
          .strict()
      )
      .max(100),
  })
  .strict()
  .meta({ id: 'range_key', title: 'Range Key' });

const multiFieldKeySchema = z
  .object({
    type: z.literal('multi_field_key'),
    keys: z.array(z.string()).max(100),
  })
  .strict()
  .meta({ id: 'multi_field_key', title: 'Multi Field Key' });

export const serializedValueSchema = z.union([
  z.string(),
  z.number(),
  rangeKeySchema,
  multiFieldKeySchema,
]);

export type SerializableValueType = z.output<typeof serializedValueSchema>;
