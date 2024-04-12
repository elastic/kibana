/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Joi from 'joi';
import { metaFields } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { parse } from '../../parse';
import { deleteField, stripBadDefault } from './utils';
import { Context } from '..';
import { processRef } from './ref';

const {
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
} = metaFields;

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

const processAdditionalProperties = (ctx: Context, schema: OpenAPIV3.SchemaObject) => {
  if (META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES in schema) {
    const fn = schema[META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES] as () => Joi.Schema<unknown>;
    const { result: additionalSchema } = parse({ ctx, schema: fn() });
    schema.additionalProperties = additionalSchema;
    deleteField(schema, META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES);
  } else {
    schema.additionalProperties = true;
  }
};

export const processRecord = (ctx: Context, schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
  processAdditionalProperties(ctx, schema);
  if (schema.additionalProperties) {
    schema.additionalProperties =
      processRef(ctx, schema.additionalProperties as OpenAPIV3.SchemaObject) ??
      schema.additionalProperties;
  }
};

export const processMap = (ctx: Context, schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
  processAdditionalProperties(ctx, schema);
  if (schema.additionalProperties) {
    schema.additionalProperties =
      processRef(ctx, schema.additionalProperties as OpenAPIV3.SchemaObject) ??
      schema.additionalProperties;
  }
};

export const processAny = (schema: OpenAPIV3.SchemaObject): void => {
  stripBadDefault(schema);
};

export { processObject } from './object';
export { processRef } from './ref';
