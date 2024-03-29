/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { metaFields } from '@kbn/config-schema';
import { deleteField, stripBadDefault } from './utils';

const { META_FIELD_X_OAS_MAX_LENGTH, META_FIELD_X_OAS_MIN_LENGTH } = metaFields;

export { processObject } from './object';

export const processString = (schema: OpenAPIV3.SchemaObject): void => {
  if (META_FIELD_X_OAS_MIN_LENGTH in schema) {
    schema.minLength = schema[META_FIELD_X_OAS_MIN_LENGTH] as number;
    deleteField(schema, META_FIELD_X_OAS_MIN_LENGTH);
  }
  if (META_FIELD_X_OAS_MAX_LENGTH in schema) {
    schema.maxLength = schema[META_FIELD_X_OAS_MAX_LENGTH] as number;
    deleteField(schema, META_FIELD_X_OAS_MAX_LENGTH);
  }
};

export const processRecord = (schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
};

export const processMap = (schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
};

export const processAny = (schema: OpenAPIV3.SchemaObject): void => {
  stripBadDefault(schema);
};
