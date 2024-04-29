/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SERVICE_KEY, SERVICE_KEY_LEGACY } from '../constants';

import {
  fieldSpecSchema,
  runtimeFieldSchema,
  serializedFieldFormatSchema,
  fieldSpecSchemaFields,
} from '../../common/schemas';
import { MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH } from '../../common/constants';

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

export const dataViewsRuntimeResponseSchema = schema.object({
  [SERVICE_KEY]: dataViewSpecSchema,
  fields: schema.arrayOf(schema.object(fieldSpecSchemaFields)),
});

export const indexPatternsRuntimeResponseSchema = schema.object({
  [SERVICE_KEY_LEGACY]: dataViewSpecSchema,
  field: schema.object(fieldSpecSchemaFields),
});

export const runtimeResponseSchema = schema.oneOf([
  dataViewsRuntimeResponseSchema,
  indexPatternsRuntimeResponseSchema,
]);
