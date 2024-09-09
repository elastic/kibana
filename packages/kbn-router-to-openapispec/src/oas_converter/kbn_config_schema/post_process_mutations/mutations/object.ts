/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { metaFields } from '@kbn/config-schema';
import { deleteField, stripBadDefault } from './utils';

const { META_FIELD_X_OAS_OPTIONAL } = metaFields;

const isNullable = (schema: OpenAPIV3.SchemaObject): boolean => {
  return schema.nullable === true;
};

const hasDefault = (schema: OpenAPIV3.SchemaObject): boolean => {
  return schema.default != null;
};

const populateRequiredFields = (schema: OpenAPIV3.SchemaObject): void => {
  if (!schema.properties) return;
  const required: string[] = [];

  const entries = Object.entries(schema.properties as Record<string, OpenAPIV3.SchemaObject>);
  for (const [key, value] of entries) {
    if (META_FIELD_X_OAS_OPTIONAL in value) {
      deleteField(value, META_FIELD_X_OAS_OPTIONAL);
    } else if (
      hasDefault(value) ||
      Boolean(value.anyOf && value.anyOf.some((v) => isNullable(v as OpenAPIV3.SchemaObject)))
    ) {
      // Must not be added to the required array
    } else {
      required.push(key);
    }
  }

  if (required.length > 0) schema.required = required;
};

const removeNeverType = (schema: OpenAPIV3.SchemaObject): void => {
  if (!schema.properties) return;
  for (const [key, value] of Object.entries(schema.properties)) {
    if (Object.keys(value).length === 1 && 'not' in value) {
      delete schema.properties[key];
    }
  }
};

export const processObject = (schema: OpenAPIV3.SchemaObject): void => {
  stripBadDefault(schema);
  removeNeverType(schema);
  populateRequiredFields(schema);
};
