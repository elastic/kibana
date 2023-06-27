/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UrlParamValue } from './types/autocomplete_definition_types';
import type { AutocompleteUrlParams, SpecificationTypes } from './types';
import { findTypeDefinition } from './utils';
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
        const behaviorType = foundBehavior as SpecificationTypes.Interface;
        // if there are any properties in the behavior type, iterate over each and add it to url params
        const { properties } = behaviorType;
        urlParams = convertProperties(properties, urlParams, schema);
      }
    }
  }

  // iterate over properties in query
  urlParams = convertProperties(query, urlParams, schema);

  return urlParams;
};

const convertInstanceOf = (
  type: SpecificationTypes.InstanceOf,
  serverDefault: SpecificationTypes.Property['serverDefault'],
  schema: SpecificationTypes.Model
): UrlParamValue | undefined => {
  const { type: typeName } = type;
  const { name: propertyName } = typeName;
  // text property
  if (propertyName === 'string') {
    // add default value if any
    return serverDefault ?? '';
  }
  // boolean
  else if (propertyName === 'boolean') {
    return '__flag__';
  }
  // duration
  else if (propertyName === 'Duration') {
    // add default value if any
    return serverDefault ?? '';
  }
  // names
  else if (propertyName === 'Names') {
    return [];
  } else {
    // if it's a defined type, try to convert it
    const definedType = findTypeDefinition(schema, typeName);
    if (definedType) {
      // if it's enum
      if (definedType.kind === 'enum') {
        return convertEnum(definedType as SpecificationTypes.Enum);
      } else if (definedType.kind === 'type_alias') {
        const aliasValueOf = definedType.type;
        return convertValueOf(aliasValueOf, serverDefault, schema);
      }
    }
  }
};

const convertProperties = (
  properties: SpecificationTypes.Property[],
  urlParams: AutocompleteUrlParams,
  schema: SpecificationTypes.Model
): AutocompleteUrlParams => {
  for (const property of properties) {
    const { name, serverDefault, type } = property;
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
  } else if (kind === 'union_of') {
    const { items } = valueOf;
    const itemValues = new Set();
    for (const item of items) {
      if (item.kind === 'instance_of') {
        const convertedValue = convertInstanceOf(item, serverDefault, schema);
        if (convertedValue instanceof Array) {
          convertedValue.forEach((v) => itemValues.add(v));
        } else itemValues.add(convertedValue);
      } else if (item.kind === 'array_of') {
        if (item.value.kind === 'instance_of') {
          const convertedValue = convertInstanceOf(item.value, serverDefault, schema);
          if (convertedValue instanceof Array) {
            convertedValue.forEach((v) => itemValues.add(v));
          } else itemValues.add(convertedValue);
        }
      }
    }
    return [...itemValues] as UrlParamValue;
  }
};

const convertEnum = (enumDefinition: SpecificationTypes.Enum): UrlParamValue => {
  const { members } = enumDefinition;
  return members.map((member) => member.name);
};
