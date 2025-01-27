/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';
import {
  MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
  RUNTIME_FIELD_TYPES,
  RUNTIME_FIELD_TYPES2,
} from './constants';

/**
 * Runtime field types
 */
type RuntimeType = (typeof RUNTIME_FIELD_TYPES)[number];

const serializedFieldFormatSchema = schema.object({
  id: schema.maybe(schema.string()),
  params: schema.maybe(schema.any()),
});

const runtimeFieldNonCompositeFieldsSpecTypeSchema = schema.oneOf(
  RUNTIME_FIELD_TYPES2.map((runtimeFieldType) => schema.literal(runtimeFieldType)) as [
    Type<RuntimeType>
  ]
);

const primitiveRuntimeFieldSchemaShared = {
  script: schema.maybe(
    schema.object({
      source: schema.string(),
    })
  ),
  format: schema.maybe(serializedFieldFormatSchema),
  customLabel: schema.maybe(schema.string()),
  customDescription: schema.maybe(
    schema.string({
      maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
    })
  ),
  popularity: schema.maybe(
    schema.number({
      min: 0,
    })
  ),
};

const primitiveRuntimeFieldSchema = schema.object({
  type: runtimeFieldNonCompositeFieldsSpecTypeSchema,
  ...primitiveRuntimeFieldSchemaShared,
});

const compositeRuntimeFieldSchemaShared = {
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
        customDescription: schema.maybe(
          schema.string({
            maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
          })
        ),
        popularity: schema.maybe(
          schema.number({
            min: 0,
          })
        ),
      })
    )
  ),
};

const compositeRuntimeFieldSchema = schema.object({
  type: schema.literal('composite') as Type<RuntimeType>,
  ...compositeRuntimeFieldSchemaShared,
});

const runtimeFieldSchema = schema.oneOf([primitiveRuntimeFieldSchema, compositeRuntimeFieldSchema]);

const fieldSpecSchemaFields = {
  name: schema.string({
    maxLength: 1000,
  }),
  type: schema.string({
    defaultValue: 'string',
    maxLength: 1000,
  }),
  count: schema.maybe(
    schema.number({
      min: 0,
    })
  ),
  script: schema.maybe(
    schema.string({
      maxLength: 1000000,
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
  customDescription: schema.maybe(
    schema.string({
      maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
    })
  ),
  shortDotsEnable: schema.maybe(schema.boolean()),
  searchable: schema.maybe(schema.boolean()),
  aggregatable: schema.maybe(schema.boolean()),
  readFromDocValues: schema.maybe(schema.boolean()),
  runtimeField: schema.maybe(runtimeFieldSchema),
};

const fieldSpecSchema = schema.object(fieldSpecSchemaFields, {
  // Allow and ignore unknowns to make fields transient.
  // Because `fields` have a bunch of calculated fields
  // this allows to retrieve an index pattern and then to re-create by using the retrieved payload
  unknowns: 'ignore',
});

export const dataViewSpecSchema = schema.object({
  title: schema.string(),
  version: schema.maybe(schema.string()),
  id: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  timeFieldName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: schema.string(),
        clientId: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
      })
    )
  ),
  fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
  fieldAttrs: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        customLabel: schema.maybe(schema.string()),
        customDescription: schema.maybe(
          schema.string({
            maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
          })
        ),
        count: schema.maybe(schema.number()),
      })
    )
  ),
  allowNoIndex: schema.maybe(schema.boolean()),
  runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSchema)),
  name: schema.maybe(schema.string()),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
  allowHidden: schema.maybe(schema.boolean()),
});
