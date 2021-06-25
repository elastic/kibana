/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { mapValues } from 'lodash';

type JSONSchemableValueType =
  | t.StringType
  | t.NumberType
  | t.BooleanType
  | t.ArrayType<t.Mixed>
  | t.RecordC<t.Mixed, t.Mixed>
  | t.DictionaryType<t.Mixed, t.Mixed>
  | t.InterfaceType<t.Props>
  | t.PartialType<t.Props>
  | t.UnionType<t.Mixed[]>
  | t.IntersectionType<t.Mixed[]>;

// type JSONSchemaArrayRuntimeType = t.ArrayType<JSONSchemaRuntimeType>;

// type JSONSchemaObjectRuntimeType = t.InterfaceType<{ [key: string]: JSONSchemaRuntimeType }>;
// type JSONSchemaRuntimeType =
//   | t.StringType
//   | t.NumberType
//   | t.BooleanType
//   | JSONSchemaArrayRuntimeType
//   | JSONSchemaObjectRuntimeType

const tags = [
  'StringType',
  'NumberType',
  'BooleanType',
  'ArrayType',
  'DictionaryType',
  'InterfaceType',
  'PartialType',
  'UnionType',
  'IntersectionType',
];

const isSchemableValueType = (type: t.Mixed): type is JSONSchemableValueType => {
  // @ts-ignore
  return tags.includes(type._tag);
};

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

export const toJsonSchema = (type: t.Mixed): JSONSchema => {
  if (isSchemableValueType(type)) {
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
