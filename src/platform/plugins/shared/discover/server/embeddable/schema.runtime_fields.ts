/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const RUNTIME_FIELD_TYPES = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
] as const;

/**
 * The type of the runtime field (e.g., 'keyword', 'long', 'date').
 * Example: 'keyword'
 */
const runtimeFieldTypeSchema = schema.oneOf(
  RUNTIME_FIELD_TYPES.map((type) => schema.literal(type)) as [
    Type<(typeof RUNTIME_FIELD_TYPES)[number]>
  ]
);

const commonRuntimeFieldSchema = {
  /**
   * The name of the runtime field.
   * Example: 'my_runtime_field'
   */
  name: schema.string({
    meta: {
      description: 'The name of the runtime field. Example: "my_runtime_field".',
    },
  }),
  /**
   * The script that defines the runtime field. This should be a painless script that computes the field value at query time.
   * Example: 'emit(doc["field_name"].value * 2);'
   */
  script: schema.maybe(
    schema.string({
      meta: {
        description:
          'The script that defines the runtime field. This should be a painless script that computes the field value at query time.',
      },
    })
  ),
};

export const primitiveRuntimeFieldSchema = schema.object({
  type: runtimeFieldTypeSchema,
  /**
   * Optional format definition for the runtime field. The structure depends on the field type and use case.
   * If not provided, no format is applied.
   */
  format: schema.maybe(
    schema.object({
      type: schema.string(),
      params: schema.any(),
    })
  ),
  ...commonRuntimeFieldSchema,
});

export const compositeRuntimeFieldSchema = schema.object({
  type: schema.literal('composite'),
  fields: schema.arrayOf(
    schema.object({
      type: runtimeFieldTypeSchema,
      /**
       * The name of the subfield.
       * If the name is "field" and this subname is "name" the full name of the subfield will be "field.name".
       */
      name: schema.string({
        meta: {
          description: 'The name of the runtime field. Example: "my_runtime_field".',
        },
      }),
    }),
    { maxSize: 10_000 }
  ),
  ...commonRuntimeFieldSchema,
});

export const runtimeFieldsSchema = schema.discriminatedUnion('type', [
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);
