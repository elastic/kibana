/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type } from '@kbn/config-schema';
import { /* RUNTIME_FIELD_TYPES,*/ RuntimeType } from '../../../common';

export const serializedFieldFormatSchema = schema.object({
  id: schema.maybe(schema.string()),
  params: schema.maybe(schema.any()),
});

export const fieldSpecSchemaFields = {
  name: schema.string({
    maxLength: 1_000,
  }),
  type: schema.string({
    defaultValue: 'string',
    maxLength: 1_000,
  }),
  count: schema.maybe(
    schema.number({
      min: 0,
    })
  ),
  script: schema.maybe(
    schema.string({
      maxLength: 1_000_000,
    })
  ),
  format: schema.maybe(serializedFieldFormatSchema),
  esTypes: schema.maybe(schema.arrayOf(schema.string())),
  scripted: schema.maybe(schema.boolean()),
  subType: schema.maybe(
    schema.object({
      multi: schema.maybe(
        schema.object({
          parent: schema.string(),
        })
      ),
      nested: schema.maybe(
        schema.object({
          path: schema.string(),
        })
      ),
    })
  ),
  customLabel: schema.maybe(schema.string()),
  shortDotsEnable: schema.maybe(schema.boolean()),
};

export const fieldSpecSchema = schema.object(fieldSpecSchemaFields, {
  // Allow and ignore unknowns to make fields transient.
  // Because `fields` have a bunch of calculated fields
  // this allows to retrieve an index pattern and then to re-create by using the retrieved payload
  unknowns: 'ignore',
});

export const RUNTIME_FIELD_TYPES2 = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
] as const;

export const runtimeFieldNonCompositeFieldsSpecTypeSchema = schema.oneOf(
  RUNTIME_FIELD_TYPES2.map((runtimeFieldType) => schema.literal(runtimeFieldType)) as [
    Type<RuntimeType>
  ]
);

export const primitiveRuntimeFieldSchema = schema.object({
  type: runtimeFieldNonCompositeFieldsSpecTypeSchema,
  script: schema.maybe(
    schema.object({
      source: schema.string(),
    })
  ),
  format: schema.maybe(serializedFieldFormatSchema),
  customLabel: schema.maybe(schema.string()),
  popularity: schema.maybe(
    schema.number({
      min: 0,
    })
  ),
});

export const compositeRuntimeFieldSchema = schema.object({
  type: schema.literal('composite') as Type<RuntimeType>,
  script: schema.maybe(
    schema.object({
      source: schema.string(),
    })
  ),
  fields: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        type: runtimeFieldNonCompositeFieldsSpecTypeSchema,
        format: schema.maybe(serializedFieldFormatSchema),
        customLabel: schema.maybe(schema.string()),
        popularity: schema.maybe(
          schema.number({
            min: 0,
          })
        ),
      })
    )
  ),
});

export const runtimeFieldSchema = schema.oneOf([
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);
