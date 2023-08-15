/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DefinitionUrlParams } from '@kbn/console-plugin/common/types';
import type { SpecificationTypes } from '../types';
import { findTypeDefinition } from './find_type_definition';

const booleanFlagString = '__flag__';
const trueValueString = String(true);
const falseValueString = String(false);
// use unknown for now since DefinitionUrlParams is Record<string, unknown>
// TODO update with more concrete types
type UrlParamValue = unknown;

export const convertUrlProperties = (
  properties: SpecificationTypes.Property[],
  urlParams: DefinitionUrlParams,
  schema: SpecificationTypes.Model
): DefinitionUrlParams => {
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
  throw new Error('unexpected valueOf type ' + kind);
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
