/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import joiToJsonParse from 'joi-to-json';
import joi from 'joi';
import { isConfigSchema, Type } from '@kbn/config-schema';
import { get } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import type { OpenAPIConverter } from '../type';
import { validatePathParameters } from './common';

const parse = (schema: joi.Schema) => {
  return joiToJsonParse(schema, 'open-api');
};

const isObjectType = (schema: joi.Schema | joi.Description) => {
  return schema.type === 'object';
};

const emptyObjectAllowsUnknowns = (schema: joi.Description) => {
  return (
    isObjectType(schema) &&
    Object.keys(schema.keys).length === 0 &&
    get(schema, 'flags.unknown') === true
  );
};

function assertInstanceOfKbnConfigSchema(schema: unknown): asserts schema is Type<any> {
  if (!is(schema)) {
    throw new Error('@kbn/config-schema validator expected');
  }
}

const unwrapKbnConfigSchema = (schema: unknown): joi.Schema => {
  assertInstanceOfKbnConfigSchema(schema);
  return schema.getSchema();
};

const isSchemaRequired = (schema: joi.Schema | joi.Description): boolean => {
  if (joi.isSchema(schema)) {
    return schema._flags?.presence === 'required';
  }
  return 'required' === get(schema, 'flags.presence');
};

const convert = (kbnConfigSchema: unknown): OpenAPIV3.BaseSchemaObject => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  return parse(schema);
};

const convertObjectMembersToParameterObjects = (
  schema: joi.Schema,
  isPathParameter = false
): OpenAPIV3.ParameterObject[] => {
  const isRequired = isSchemaRequired(schema);
  const { properties } = parse(schema);
  return Object.entries(properties as { [key: string]: OpenAPIV3.SchemaObject }).map(
    ([schemaKey, schemaObject]) => {
      const isSubSchemaRequired = isSchemaRequired(schemaObject);
      const { description, ...openApiSchemaObject } = schemaObject;
      return {
        name: schemaKey,
        in: isPathParameter ? 'path' : 'query',
        required: isPathParameter || (isRequired && isSubSchemaRequired),
        schema: openApiSchemaObject,
        description,
      };
    }
  );
};

const convertQuery = (kbnConfigSchema: unknown): OpenAPIV3.ParameterObject[] => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  if (!isObjectType(schema)) {
    throw new Error('Input parser must be a JoiSchema');
  }
  return convertObjectMembersToParameterObjects(schema, true);
};

const convertPathParameters = (
  kbnConfigSchema: unknown,
  pathParameters: string[]
): OpenAPIV3.ParameterObject[] => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);

  if (!isObjectType(schema)) {
    throw new Error('Input parser must be a JoiSchema');
  }

  const schemaDescription = schema.describe();
  const schemaKeys = Object.keys(schemaDescription.keys);
  validatePathParameters(pathParameters, schemaKeys);

  return convertObjectMembersToParameterObjects(schema, true);
};

const is = (schema: unknown): boolean => {
  if (isConfigSchema(schema)) {
    const description = schema.getSchema().describe();
    // We ignore "any" @kbn/config-schema for the purposes of OAS generation...
    if (
      description.type === 'any' ||
      (!isSchemaRequired(description) && emptyObjectAllowsUnknowns(description))
    ) {
      return false;
    }
    return true;
  }
  return false;
};

export const kbnConfigSchemaConverter: OpenAPIConverter = {
  convertQuery,
  convertPathParameters,
  convert,
  is,
};
