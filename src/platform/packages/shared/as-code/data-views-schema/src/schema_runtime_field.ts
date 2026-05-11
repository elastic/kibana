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
import type {
  PrimitiveRuntimeFieldTypes,
  RuntimeFieldCompositeType,
} from '@kbn/data-views-plugin/common';
import { fieldSettingsBaseSchema } from './schema_field_settings';

export const PRIMITIVE_RUNTIME_FIELD_TYPES: PrimitiveRuntimeFieldTypes = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
];

export const RUNTIME_FIELD_COMPOSITE_TYPE: RuntimeFieldCompositeType = 'composite';

const MAX_NAME_LENGTH = 1000;

const scriptSchema = schema.maybe(
  schema.string({
    minLength: 1,
    meta: {
      id: 'kbn-runtime-field-script',
      title: 'Script',
      description:
        "The script that defines the runtime field. This should be a painless script that computes the field value at query time. Runtime fields without a script retrieve values from _source. If the field doesn't exist in _source, a search request returns no value.",
    },
  })
);

export const runtimeFieldBaseSchema = fieldSettingsBaseSchema.extends({
  type: schema.oneOf(
    PRIMITIVE_RUNTIME_FIELD_TYPES.map((type) => schema.literal(type)) as [
      Type<(typeof PRIMITIVE_RUNTIME_FIELD_TYPES)[number]>
    ],
    {
      meta: {
        id: 'kbn-runtime-field-type',
        title: 'Type',
        description: 'The type of the runtime field (e.g., "keyword", "long", "date").',
      },
    }
  ),
});

export const primitiveRuntimeFieldSchema = runtimeFieldBaseSchema.extends(
  {
    script: scriptSchema,
  },
  { meta: { id: 'kbn-runtime-field-schema', title: 'Runtime field' } }
);

export const compositeRuntimeFieldSchema = schema.object(
  {
    type: schema.literal(RUNTIME_FIELD_COMPOSITE_TYPE),
    fields: schema.recordOf(
      schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
      runtimeFieldBaseSchema
    ),
    script: scriptSchema,
  },
  { meta: { id: 'kbn-composite-runtime-field-schema', title: 'Composite runtime field' } }
);

export const runtimeFieldSchema = schema.discriminatedUnion('type', [
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);
