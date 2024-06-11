/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { forEach, isArray, isPlainObject, mapValues, mergeWith, uniq } from 'lodash';
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
  const?: string | number | boolean;
  enum?: Array<string | number | boolean>;
}

type JSONSchema =
  | JSONSchemaObject
  | JSONSchemaArray
  | BaseJSONSchema
  | JSONSchemaOneOf
  | JSONSchemaAllOf
  | JSONSchemaAnyOf;

const naiveToJsonSchema = (type: t.Type<any> | ParseableType): JSONSchema => {
  if (isParsableType(type)) {
    switch (type._tag) {
      case 'ArrayType':
        return { type: 'array', items: naiveToJsonSchema(type.type) };

      case 'BooleanType':
        return { type: 'boolean' };

      case 'DictionaryType':
        return { type: 'object', additionalProperties: naiveToJsonSchema(type.codomain) };

      case 'InterfaceType':
        return {
          type: 'object',
          properties: mapValues(type.props, naiveToJsonSchema),
          required: Object.keys(type.props),
        };

      case 'PartialType':
        return { type: 'object', properties: mapValues(type.props, naiveToJsonSchema) };

      case 'UnionType':
        return { anyOf: type.types.map(naiveToJsonSchema) };

      case 'IntersectionType':
        return { allOf: type.types.map(naiveToJsonSchema) };

      case 'NumberType':
        return { type: 'number' };

      case 'StringType':
        return { type: 'string' };

      case 'LiteralType':
        return {
          type: typeof type.value,
          const: type.value,
        };
    }
  }

  return {
    type: 'object',
  };
};

export const toJsonSchema = (type: t.Type<any> | ParseableType): JSONSchema => {
  const result = naiveToJsonSchema(type);

  function mergeAllOf(allOf: JSONSchemaAllOf['allOf']) {
    return mergeWith(
      {},
      ...allOf,
      function mergeRecursively(objectValue: any, sourceValue: any, keyToMerge: string): object {
        if (objectValue === undefined) {
          return sourceValue;
        }

        if (isPlainObject(sourceValue) && keyToMerge !== 'properties' && 'type' in sourceValue) {
          const isMergable = sourceValue.type === objectValue.type;
          if (!isMergable) {
            return { anyOf: [objectValue, sourceValue] };
          }
        }

        if (isPlainObject(objectValue) && isPlainObject(sourceValue)) {
          forEach(sourceValue, (value, key) => {
            objectValue[key] = mergeRecursively(objectValue[key], value, key);
          });
          return objectValue;
        }

        if (isArray(objectValue) && isArray(sourceValue)) {
          forEach(sourceValue, (value) => {
            if (objectValue.indexOf(value) === -1) {
              objectValue.push(value);
            }
          });
          return objectValue;
        }

        return sourceValue;
      }
    );
  }

  function walkObject(
    object: any,
    iteratee: (source: Record<string, any>, value: any, key: string) => unknown
  ) {
    if (isPlainObject(object) || isArray(object)) {
      forEach(object as Record<string, any>, (value, key) => {
        object = iteratee(object, walkObject(value, iteratee), key);
      });
    }
    return object;
  }

  return walkObject(result, (source, value, key) => {
    if (key === 'allOf') {
      // merge t.intersection() where possible
      const merged = mergeAllOf(value);
      return merged;
    } else if (key === 'anyOf') {
      // merge t.union() where possible
      const anyOf = value as JSONSchemaAnyOf['anyOf'];
      const types = uniq(anyOf.map((schema) => ('type' in schema ? schema.type : schema)));

      // only merge if type is the same everywhere
      if (
        types.length === 1 &&
        typeof types[0] === 'string' &&
        ['string', 'number', 'boolean'].includes(types[0])
      ) {
        return {
          type: types[0],
          enum: anyOf
            .filter((schema): schema is BaseJSONSchema => 'const' in schema || 'enum' in schema)
            .flatMap((schema) => schema.const || schema.enum || []),
        };
      }
    }
    if (isPlainObject(source)) {
      source[key] = value;
    }
    return source;
  });
};
