/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Types important for this conversion
 * Body = ValueBody | PropertiesBody | NoBody
 * ValueOf = InstanceOf | ArrayOf | UnionOf | DictionaryOf | UserDefinedValue | LiteralValue
 *
 * Request has `body` property which is "Body"
 * - "Body" can be one of
 *   - "ValueBody"
 *     - has a `value` property which is "ValueOf"
 *     - convert "ValueOf"
 *   - "PropertiesBody"
 *     - has a `properties` property which is "Property[]"
 *     - each "Property" has a `type` property which is "ValueOf"
 *     - convert "ValueOf"
 *   - "NoBody"
 *     - this an empty request body
 *
 * Convert "ValueOf" which can be one of
 * - "InstanceOf"
 *   - has a `type` property which is "TypeName"
 *     - if "TypeName" has a `namespace` = "_builtins" then it's a primitive type
 *     - if "TypeName" has a `namespace` = "_types" then it's a defined type that can be found in the schema
 *       - the found "TypeDefinition" can be
 *         - "Enum"
 *           - has a `members` property which is "EnumMember[]"
 *           - each "EnumMember" has a `name` property
 *           - convert `name` to a value
 *         - "TypeAlias"
 *           - has a `type` property which is "ValueOf"
 *         - "Interface"
 *           - has a `properties` property which is "Property[]"
 *           - each "Property" has a `type` property which is "ValueOf"
 * - "ArrayOf"
 *   - has a `value` property which is "ValueOf"
 * - "UnionOf"
 *   - has a `items` property which is "ValueOf[]"
 * - "DictionaryOf"
 *   - has a `key` and a `value` properties which are both "ValueOf"
 * - "UserDefinedValue"
 *   - can be any arbitrary value
 * - "LiteralValue"
 *   - has a `value` property which is string, number or boolean
 */

import { AutocompleteBodyParams, SpecificationTypes } from './types';
import { findTypeDefinition } from './utils';

export const generateBodyParams = (
  requestType: SpecificationTypes.Request,
  schema: SpecificationTypes.Model
): AutocompleteBodyParams => {
  const { body } = requestType;
  const { kind } = body;
  if (kind === 'no_body') {
    return {};
  } else if (kind === 'properties') {
    return convertProperties(body.properties, schema);
  } else if (kind === 'value') {
    return convertValueBody(body);
  }
  return {};
};

const convertProperties = (
  properties: SpecificationTypes.Property[],
  schema: SpecificationTypes.Model
): AutocompleteBodyParams => {
  const bodyParams = {} as AutocompleteBodyParams;
  for (const property of properties) {
    const { type, name } = property;
    bodyParams[name] = convertValueOf(type, schema);
  }
  return bodyParams;
};

const convertValueBody = (body: SpecificationTypes.ValueBody): AutocompleteBodyParams => {
  return {};
};

const convertValueOf = (
  valueOf: SpecificationTypes.ValueOf,
  schema: SpecificationTypes.Model
): any => {
  const { kind } = valueOf;
  switch (kind) {
    case 'instance_of':
      return convertInstanceOf(valueOf, schema);
    case 'array_of':
      return convertArrayOf(valueOf);
    case 'union_of':
      return convertUnionOf(valueOf);
    case 'dictionary_of':
      return convertDictionaryOf(valueOf);
    case 'literal_value':
      return convertLiteralValue(valueOf);
    case 'user_defined_value':
    default:
      return '';
  }
};

const convertInstanceOf = (
  instanceOf: SpecificationTypes.InstanceOf,
  schema: SpecificationTypes.Model
): any => {
  const { type } = instanceOf;
  if (type.namespace === '_builtins') {
    /**
     * - `string`
     * - `boolean`
     * - `number`
     * - `null`
     * - `void`
     * - `binary`
     */
  } else {
    const definedType = findTypeDefinition(schema, type);
    if (definedType) {
      // interface
      if (definedType.kind === 'interface') {
        return convertInterface(definedType, schema);
      }
      // enum
      // type_alias
    }
  }
  return '';
};

const convertArrayOf = (arrayOf: SpecificationTypes.ArrayOf): any => {};

const convertUnionOf = (unionOf: SpecificationTypes.UnionOf): any => {};

const convertDictionaryOf = (dictionaryOf: SpecificationTypes.DictionaryOf): any => {};

const convertLiteralValue = (literalValue: SpecificationTypes.LiteralValue): any => {};

const convertInterface = (
  interfaceType: SpecificationTypes.Interface,
  schema: SpecificationTypes.Model
): any => {
  const { properties } = interfaceType;
  return convertProperties(properties, schema);
};
