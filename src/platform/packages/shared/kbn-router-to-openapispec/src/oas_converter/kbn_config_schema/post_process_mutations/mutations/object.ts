/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metaFields } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { isReferenceObject } from '../../../common';
import type { IContext } from '../context';
import { deleteField, stripBadDefault } from './utils';

const { META_FIELD_X_OAS_OPTIONAL } = metaFields;

const isNullable = (schema: OpenAPIV3.SchemaObject): boolean => {
  return schema.nullable === true;
};

const hasDefault = (schema: OpenAPIV3.SchemaObject): boolean => {
  return schema.default !== undefined;
};

const isOptionalAtRuntime = (schema: OpenAPIV3.SchemaObject): boolean => {
  return (
    META_FIELD_X_OAS_OPTIONAL in schema ||
    hasDefault(schema) ||
    Boolean(schema.anyOf && schema.anyOf.some((v) => isNullable(v as OpenAPIV3.SchemaObject)))
  );
};

const isRequiredProperty = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ctx?: IContext
): boolean => {
  if (isReferenceObject(schema)) {
    const sharedSchema = ctx?.derefSharedSchema(schema.$ref);
    return sharedSchema ? !isOptionalAtRuntime(sharedSchema) : true;
  }

  if (META_FIELD_X_OAS_OPTIONAL in schema) {
    deleteField(schema, META_FIELD_X_OAS_OPTIONAL);
    return false;
  }

  return !isOptionalAtRuntime(schema);
};

const populateRequiredFields = (schema: OpenAPIV3.SchemaObject, ctx?: IContext): void => {
  if (!schema.properties) return;
  const required: string[] = [];

  const entries = Object.entries(
    schema.properties as Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
  );
  for (const [key, value] of entries) {
    if (isRequiredProperty(value, ctx)) {
      required.push(key);
    }
  }

  if (required.length > 0) {
    schema.required = required;
  } else {
    delete schema.required;
  }
};

const removeNeverType = (schema: OpenAPIV3.SchemaObject): void => {
  if (!schema.properties) return;
  for (const [key, value] of Object.entries(schema.properties)) {
    if (Object.keys(value).length === 1 && 'not' in value) {
      delete schema.properties[key];
    }
  }
};

export const processObject = (schema: OpenAPIV3.SchemaObject, ctx?: IContext): void => {
  stripBadDefault(schema);
  removeNeverType(schema);
  populateRequiredFields(schema, ctx);
};
