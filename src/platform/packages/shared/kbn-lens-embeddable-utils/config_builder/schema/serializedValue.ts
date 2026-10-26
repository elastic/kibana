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

const rangeValueSchema = schema.oneOf([schema.string(), schema.number()]);

const rangeKeySchema = schema.object(
  {
    type: schema.literal('range_key'),
    from: schema.maybe(rangeValueSchema),
    to: schema.maybe(rangeValueSchema),
    ranges: schema.arrayOf(
      schema.object({
        from: schema.maybe(rangeValueSchema),
        to: schema.maybe(rangeValueSchema),
        label: schema.string(),
      }),
      { maxSize: 100 }
    ),
  },
  {
    meta: {
      id: 'range_key',
      title: 'Range Key',
      description: 'Identifies a range bucket. Omit either bound for an open end.',
    },
  }
);

const multiFieldKeySchema = schema.object(
  {
    type: schema.literal('multi_field_key'),
    keys: schema.arrayOf(schema.string(), { maxSize: 100 }),
  },
  {
    meta: {
      id: 'multi_field_key',
      title: 'Multi Field Key',
      description: 'Composite key from a multi-terms bucket.',
    },
  }
);

const multiValueCellSchema = schema.oneOf(
  [
    schema.arrayOf(schema.string(), { maxSize: 100 }),
    schema.arrayOf(schema.number(), { maxSize: 100 }),
    schema.arrayOf(schema.boolean(), { maxSize: 100 }),
  ],
  {
    meta: {
      id: 'multi_value_cell',
      title: 'Multi Value Cell',
      description: 'Values of a multi-value cell.',
    },
  }
);

export const serializedValueSchema = schema.oneOf([
  schema.string(),
  schema.number(),
  schema.boolean(),
  schema.literal(null),
  multiValueCellSchema,
  rangeKeySchema,
  multiFieldKeySchema,
]);

export type SerializableValueType = TypeOf<typeof serializedValueSchema>;
export type RangeKeyType = TypeOf<typeof rangeKeySchema>;
