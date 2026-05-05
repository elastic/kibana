/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { isValidId } from './is_valid_id';

export const asCodeIdSchema = schema.string({
  meta: {
    description:
      'A unique identifier. Must contain only lowercase letters, numbers, hyphens, and underscores.',
  },
  validate: (value) => {
    if (!isValidId(value)) {
      return 'ID must contain only lowercase letters, numbers, hyphens, and underscores.';
    }
  },
  minLength: 1,
  maxLength: 250,
});

/**
 * Object schema with a single `ref_id` property (reference to another library item by id).
 * We don't reuse the `asCodeIdSchema` here because it must work for objects created before the ID validation was added.
 */
export const asCodeRefIdSchema = schema.object(
  {
    ref_id: schema.string({
      meta: {
        description: 'Unique identifier of the referenced library item.',
      },
      minLength: 1,
    }),
  },
  {
    meta: {
      id: 'kbn-as-code-ref-id',
      title: 'Library item reference',
      description:
        'References another library item by its unique identifier. Set `ref_id` to the unique identifier of the target library item.',
    },
  }
);

export type AsCodeRefId = TypeOf<typeof asCodeRefIdSchema>;
export function isByReference(value: unknown): value is AsCodeRefId {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ref_id' in value &&
    typeof value.ref_id === 'string'
  );
}
