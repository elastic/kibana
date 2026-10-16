/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';

const rangeValueSchema = lazySchema(() => z.union([z.string(), z.number()]));

const primitiveValueSchema = lazySchema(() => z.union([z.string(), z.number(), z.boolean()]));

const rangeKeySchema = lazySchema(() =>
  z
    .object({
      type: z.literal('range_key'),
      from: rangeValueSchema.optional(),
      to: rangeValueSchema.optional(),
      ranges: z
        .array(
          z
            .object({
              from: rangeValueSchema.optional(),
              to: rangeValueSchema.optional(),
              label: z.string(),
            })
            .strict()
        )
        .max(100),
    })
    .strict()
    .meta({ id: 'visRangeKey', title: 'Range Key' })
);

const multiFieldKeySchema = lazySchema(() =>
  z
    .object({
      type: z.literal('multi_field_key'),
      keys: z.array(z.string()).max(100),
    })
    .strict()
    .meta({ id: 'visMultiFieldKey', title: 'Multi Field Key' })
);

export const serializedValueSchema = lazySchema(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(primitiveValueSchema).max(100),
    rangeKeySchema,
    multiFieldKeySchema,
  ])
);

export type SerializableValueType = z.output<typeof serializedValueSchema>;
export type RangeKeyType = z.output<typeof rangeKeySchema>;
