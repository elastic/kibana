/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Types that are important for query params conversion:
 * TypeDefinition = Interface | Request | Response | Enum | TypeAlias
 * ValueOf = InstanceOf | ArrayOf | UnionOf | DictionaryOf | UserDefinedValue | LiteralValue;
 *
 * Conversion steps:
 * 1. The schema has a property  `endpoints` which is "Endpoint[]"
 * 2. Each "Endpoint" has a property `request` which is "TypeName"
 * 3. Using "TypeName" we find the "TypeDefinition" in the property `types` of the schema
 * 4. the "TypeDefinition" is cast to "Request"
 * - "Request" has a property `query` which is "Property[]"
 * - "Request" has a property `attachedBehaviours` which is "string[]"
 *    With "string" we find a "TypeDefinition" that is "Interface"
 *    This "Interface" has a property `properties` which is "Property[]"
 * 5. Each "Property" (from both `query` and `attachedBehaviours`) now can be converted
 * 6. Each "Property" has a property `type` that is "ValueOf"
 * 7. If "ValueOf" can be one of "InstanceOf", "ArrayOf", "UnionOf", "DictionaryOf", "UserDefinedValue", "LiteralValue"
 * - "InstanceOf": it has a property `type` which is a "TypeName"
 *   - if "TypeName" has a `namespace` = "_builtins" then it's a primitive type like "string" -> convert according to set rules for primitives
 *   - if "TypeName" has a `namespace` = "_types" then it's a defined type that can be found in the schema
 *     - the found "TypeDefinition" can be either "Enum" or "TypeAlias" (not "Interface", "Request" or "Response")
 *       - if it's "TypeAlias", it has a property `type` which is "ValueOf" -> handle it as "ValueOf" (recursion)
 *       - if it's "Enum", it has a property `members` which is "EnumMember[]" -> convert each "EnumMember" (only need `name` property)
 * - "ArrayOf": it has a property `value` which is "ValueOf" -> convert as "ValueOf"
 * - "UnionOf": it has a property `items` which is "ValueOf[]" -> convert each as "ValueOf"
 * - "DictionaryOf": not used for query params
 * - "UserDefinedValue": not used for query params
 * - "LiteralValue": it has `value` that is `string`, `number` or `boolean`
 *
 * Autocomplete definitions currently work with 2 url param types:
 * - "__flag__" for a boolean (suggesting value 'true' and 'false')
 * - list of options in an array, for example ['30s', '-1', '0'], suggesting all 3 values in a list
 * If there is only a default value, we need to wrap it in an array, so that this value is displayed in a suggestion (similar to the list).
 * Numbers need to be converted to strings, otherwise they are not displayed as suggestions.
 *
 */

import { UrlParamValue } from './types/autocomplete_definition_types';
import type { AutocompleteUrlParams, SpecificationTypes } from './types';
import { findTypeDefinition } from './utils';

const booleanFlagString = '__flag__';
const trueValueString = String(true);
const falseValueString = String(false);

export const generateQueryParams = (
  requestType: SpecificationTypes.Request,
  schema: SpecificationTypes.Model
): AutocompleteUrlParams => {
  let urlParams = {} as AutocompleteUrlParams;
  const { types } = schema;
  const { attachedBehaviors, query } = requestType;
  // if there are any attached behaviors, iterate over each and find its type
  if (attachedBehaviors) {
    for (const attachedBehavior of attachedBehaviors) {
      const foundBehavior = types.find((type) => type.name.name === attachedBehavior);
      if (foundBehavior) {
        // attached behaviours are interfaces
        const behaviorType = foundBehavior as SpecificationTypes.Interface;
        // if there are any properties in the behavior, iterate over each and add it to url params
        const { properties } = behaviorType;
        urlParams = convertProperties(properties, urlParams, schema);
      }
    }
  }

  // iterate over properties in query and add it to url params
  urlParams = convertProperties(query, urlParams, schema);

  return urlParams;
};

const convertProperties = (
  properties: SpecificationTypes.Property[],
  urlParams: AutocompleteUrlParams,
  schema: SpecificationTypes.Model
): AutocompleteUrlParams => {
  for (const property of properties) {
    const { name, serverDefault, type } = property;
    // property has `type` which is `ValueOf`
    const convertedValue = convertValueOf(type, serverDefault, schema);
    urlParams[name] = convertedValue ?? '';
  }
  return urlParams;
};

const convertValueOf = (
  valueOf: SpecificationTypes.ValueOf,
  serverDefault: SpecificationTypes.Property['serverDefault'],
  schema: SpecificationTypes.Model
): UrlParamValue | undefined => {
  const { kind } = valueOf;
  if (kind === 'instance_of') {
    return convertInstanceOf(valueOf, serverDefault, schema);
  } else if (kind === 'array_of') {
    return convertArrayOf(valueOf, serverDefault, schema);
  } else if (kind === 'union_of') {
    return convertUnionOf(valueOf, serverDefault, schema);
  } else if (kind === 'literal_value') {
    return convertLiteralValue(valueOf);
  }
  // for query params we can ignore 'dictionary_of' and 'user_defined_value'
  return '';
};

const convertInstanceOf = (
  type: SpecificationTypes.InstanceOf,
  serverDefault: SpecificationTypes.Property['serverDefault'],
  schema: SpecificationTypes.Model
): UrlParamValue | undefined => {
  const { type: typeName } = type;
  const { name: propertyName, namespace } = typeName;
  if (namespace === '_builtins') {
    /**
     * - `string`
     * - `boolean`
     * - `number`
     * - `null` // ignore for query params
     * - `void` // ignore for query params
     * - `binary` // ignore for query params
     */

    if (propertyName === 'boolean') {
      // boolean is converted to a flag param
      return booleanFlagString;
    } else {
      // if default value, convert to string and put in an array
      return serverDefault ? [serverDefault.toString()] : '';
    }
  } else {
    // if it's a defined type, try to convert it
    const definedType = findTypeDefinition(schema, typeName);
    if (definedType) {
      // TypeDefinition can only be Enum or TypeAlias
      if (definedType.kind === 'enum') {
        return convertEnum(definedType as SpecificationTypes.Enum);
      } else if (definedType.kind === 'type_alias') {
        const aliasValueOf = definedType.type;
        return convertValueOf(aliasValueOf, serverDefault, schema);
      }
    }
  }
  return '';
};

const convertArrayOf = (
  type: SpecificationTypes.ArrayOf,
  serverDefault: SpecificationTypes.Property['serverDefault'],
  schema: SpecificationTypes.Model
): UrlParamValue | undefined => {
  const { value } = type;
  // simply convert the value of an array item
  return convertValueOf(value, serverDefault, schema);
};

const convertUnionOf = (
  type: SpecificationTypes.UnionOf,
  serverDefault: SpecificationTypes.Property['serverDefault'],
  schema: SpecificationTypes.Model
): UrlParamValue | undefined => {
  const { items } = type;
  const itemValues = new Set();
  for (const item of items) {
    // each item is ValueOf
    const convertedValue = convertValueOf(item, serverDefault, schema);
    // flatten array if needed
    if (convertedValue instanceof Array) {
      convertedValue.forEach((v) => itemValues.add(v));
    } else itemValues.add(convertedValue);
  }

  // if an empty string is in values, delete it
  if (itemValues.has('')) {
    itemValues.delete('');
  }

  // if there is a flag in the values, convert it to "true" + "false"
  if (itemValues.size > 1 && itemValues.has(booleanFlagString)) {
    itemValues.delete(booleanFlagString);
    itemValues.add(trueValueString);
    itemValues.add(falseValueString);
  }

  // if only 2 values ("true","false"), convert back to a flag
  // that can happen if the values before were ("true", "__flag__") or ("false", "__flag__")
  if (
    itemValues.size === 2 &&
    itemValues.has(trueValueString) &&
    itemValues.has(falseValueString)
  ) {
    itemValues.clear();
    itemValues.add(booleanFlagString);
  }

  // if only 1 element that is a flag, don't put it in an array
  if (itemValues.size === 1 && itemValues.has(booleanFlagString)) {
    return itemValues.values().next().value;
  }
  return [...itemValues] as UrlParamValue;
};

const convertLiteralValue = (type: SpecificationTypes.LiteralValue): UrlParamValue | undefined => {
  // convert the value to a string
  return [type.value.toString()];
};

const convertEnum = (enumDefinition: SpecificationTypes.Enum): UrlParamValue => {
  const { members } = enumDefinition;
  // only need the `name` property
  return members.map((member) => member.name);
};
