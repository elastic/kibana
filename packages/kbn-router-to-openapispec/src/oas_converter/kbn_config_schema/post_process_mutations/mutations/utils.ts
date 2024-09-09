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

export const stripBadDefault = (schema: OpenAPIV3.SchemaObject): void => {
  if (schema.default?.special === 'deep') {
    if (Object.keys(schema.default).length === 1) {
      delete schema.default;
    } else {
      delete schema.default.special;
    }
  }
  if (typeof schema.default === 'function') {
    const defaultValue = schema.default();
    if (defaultValue === undefined) {
      delete schema.default;
    } else {
      schema.default = defaultValue;
    }
  }
};

export const processDeprecated = (schema: OpenAPIV3.SchemaObject): void => {
  if (metaFields.META_FIELD_X_OAS_DEPRECATED in schema) {
    schema.deprecated = true;
    deleteField(schema, metaFields.META_FIELD_X_OAS_DEPRECATED);
  }
};

/** Just for type convenience */
export const deleteField = (schema: Record<any, unknown>, field: string): void => {
  delete schema[field];
};

export const isAnyType = (schema: OpenAPIV3.SchemaObject): boolean => {
  return metaFields.META_FIELD_X_OAS_ANY in schema;
};
