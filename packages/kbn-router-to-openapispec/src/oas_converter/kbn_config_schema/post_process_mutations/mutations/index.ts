/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Joi from 'joi';
import { metaFields } from '@kbn/config-schema';
import type { OpenAPIV3 } from '../../../../type';
import { parse } from '../../parse';
import { deleteField, stripBadDefault, processDeprecated, processDiscontinued } from './utils';
import { IContext } from '../context';

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

export const processStream = (schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
};

const processAdditionalProperties = (ctx: IContext, schema: OpenAPIV3.SchemaObject) => {
  if (META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES in schema) {
    const fn = schema[META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES] as () => Joi.Schema<unknown>;
    const { result: additionalSchema } = parse({ ctx, schema: fn() });
    schema.additionalProperties = additionalSchema;
    deleteField(schema, META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES);
  } else {
    schema.additionalProperties = true;
  }
};

export const processRecord = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
  processAdditionalProperties(ctx, schema);
};

export const processMap = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
  processAdditionalProperties(ctx, schema);
};

export const processAllTypes = (schema: OpenAPIV3.SchemaObject): void => {
  processDeprecated(schema);
  processDiscontinued(schema);
  stripBadDefault(schema);
};

export const processAnyType = (schema: OpenAPIV3.SchemaObject): void => {
  // Map schema to an empty object: `{}`
  for (const key of Object.keys(schema)) {
    deleteField(schema as unknown as Record<any, unknown>, key);
  }
};

export { processObject } from './object';

export { processEnum } from './enum';
