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
    .meta({
      id: 'visRangeKey',
      title: 'Range Key',
      description: 'Identifies a range bucket. Omit either bound for an open end.',
    })
);

const multiFieldKeySchema = lazySchema(() =>
  z
    .object({
      type: z.literal('multi_field_key'),
      keys: z.array(z.string()).max(100),
    })
    .strict()
    .meta({
      id: 'visMultiFieldKey',
      title: 'Multi Field Key',
      description: 'Composite key from a multi-terms bucket.',
    })
);

const multiValueCellSchema = lazySchema(() =>
  z
    .union([
      z.array(z.string()).max(100),
      z.array(z.number()).max(100),
      z.array(z.boolean()).max(100),
    ])
    .meta({
      id: 'visMultiValueCell',
      title: 'Multi Value Cell',
      description: 'Values of a multi-value cell.',
    })
);

export const serializedValueSchema = lazySchema(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    multiValueCellSchema,
    rangeKeySchema,
    multiFieldKeySchema,
  ])
);

export type SerializableValueType = z.output<typeof serializedValueSchema>;
export type RangeKeyType = z.output<typeof rangeKeySchema>;
