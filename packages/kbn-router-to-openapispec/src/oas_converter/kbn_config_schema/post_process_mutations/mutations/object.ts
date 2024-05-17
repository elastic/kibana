/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { metaFields } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { IContext } from '../context';
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

  schema.required = required;
};

const removeNeverType = (schema: OpenAPIV3.SchemaObject): void => {
  if (!schema.properties) return;
  for (const [key, value] of Object.entries(schema.properties)) {
    if (Object.keys(value).length === 1 && 'not' in value) {
      delete schema.properties[key];
    }
  }
};

const processObjectRefs = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      schema.properties![key] = ctx.processRef(schema.properties![key] as OpenAPIV3.SchemaObject);
    });
  }
};

export const processObject = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  stripBadDefault(schema);
  removeNeverType(schema);
  populateRequiredFields(schema);
  processObjectRefs(ctx, schema);
};
