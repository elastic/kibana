/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { mapValues } from 'lodash';
import { isParsableType, ParseableType } from '../parseable_types';

interface JSONSchemaObject {
  type: 'object';
  required?: string[];
  properties?: Record<string, JSONSchema>;
  additionalProperties?: boolean | JSONSchema;
}

interface JSONSchemaOneOf {
  oneOf: JSONSchema[];
}

interface JSONSchemaAllOf {
  allOf: JSONSchema[];
}

interface JSONSchemaAnyOf {
  anyOf: JSONSchema[];
}

interface JSONSchemaArray {
  type: 'array';
  items?: JSONSchema;
}

interface BaseJSONSchema {
  type: string;
}

type JSONSchema =
  | JSONSchemaObject
  | JSONSchemaArray
  | BaseJSONSchema
  | JSONSchemaOneOf
  | JSONSchemaAllOf
  | JSONSchemaAnyOf;

export const toJsonSchema = (type: t.Type<any> | ParseableType): JSONSchema => {
  if (isParsableType(type)) {
    switch (type._tag) {
      case 'ArrayType':
        return { type: 'array', items: toJsonSchema(type.type) };

      case 'BooleanType':
        return { type: 'boolean' };

      case 'DictionaryType':
        return { type: 'object', additionalProperties: toJsonSchema(type.codomain) };

      case 'InterfaceType':
        return {
          type: 'object',
          properties: mapValues(type.props, toJsonSchema),
          required: Object.keys(type.props),
        };

      case 'PartialType':
        return { type: 'object', properties: mapValues(type.props, toJsonSchema) };

      case 'UnionType':
        return { anyOf: type.types.map(toJsonSchema) };

      case 'IntersectionType':
        return { allOf: type.types.map(toJsonSchema) };

      case 'NumberType':
        return { type: 'number' };

      case 'StringType':
        return { type: 'string' };
    }
  }

  return {
    type: 'object',
  };
};
