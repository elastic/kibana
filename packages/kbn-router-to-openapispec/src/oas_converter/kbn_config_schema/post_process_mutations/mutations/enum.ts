/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { OpenAPIV3 } from 'openapi-types';
import { get } from 'lodash';
import { metaFields } from '@kbn/config-schema';
import { deleteField } from './utils';
const { META_FIELD_X_OAS_LITERAL_ENUM } = metaFields;

export const processLiteralEnum = (schema: OpenAPIV3.SchemaObject): void => {
  if (META_FIELD_X_OAS_LITERAL_ENUM in schema) {
    deleteField(schema, META_FIELD_X_OAS_LITERAL_ENUM);
    const type = get(schema, 'anyOf.0.type'); // first type
    const enumeration: string[] = [];
    for (const item of schema.anyOf!) {
      enumeration.push(get(item, 'enum.0'));
    }
    schema.enum = enumeration;
    schema.type = type;
    deleteField(schema, 'anyOf');
  }
};
