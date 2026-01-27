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
    type: schema.literal('RangeKey'),
    from: rangeValueSchema,
    to: rangeValueSchema,
    ranges: schema.arrayOf(
      schema.object({
        from: rangeValueSchema,
        to: rangeValueSchema,
        label: schema.string(),
      }),
      { maxSize: 100 }
    ),
  },
  { meta: { id: 'rangeKey' } }
);

const multiFieldKeySchema = schema.object(
  {
    type: schema.literal('multiFieldKey'),
    keys: schema.arrayOf(schema.string(), { maxSize: 100 }),
  },
  { meta: { id: 'multiFieldKey' } }
);

export const serializedValueSchema = schema.oneOf([
  schema.string(),
  schema.number(),
  rangeKeySchema,
  multiFieldKeySchema,
]);

export type SerializableValueType = TypeOf<typeof serializedValueSchema>;
