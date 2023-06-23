/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UrlParamValue } from './types/autocomplete_definition_types';
import type { AutocompleteUrlParams, SpecificationTypes } from './types';
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
        urlParams = convertProperties(properties, urlParams);
      }
    }
  }

  // iterate over properties in query
  urlParams = convertProperties(query, urlParams);

  return urlParams;
};

const convertInstanceOf = (
  type: SpecificationTypes.InstanceOf,
  serverDefault: SpecificationTypes.Property['serverDefault']
): UrlParamValue => {
  const {
    type: { name: propertyName },
  } = type;
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
  }
  return '';
};

const convertProperties = (
  properties: SpecificationTypes.Property[],
  urlParams: AutocompleteUrlParams
): AutocompleteUrlParams => {
  for (const property of properties) {
    const { name, serverDefault, type } = property;
    const { kind } = type;
    if (kind === 'instance_of') {
      urlParams[name] = convertInstanceOf(type, serverDefault);
    } else if (kind === 'union_of') {
      const { items } = type;
      const itemValues = new Set();
      for (const item of items) {
        if (item.kind === 'instance_of') {
          itemValues.add(convertInstanceOf(item, serverDefault));
        } else if (item.kind === 'array_of') {
          if (item.value.kind === 'instance_of') {
            itemValues.add(convertInstanceOf(item.value, serverDefault));
          }
        }
      }
      urlParams[name] = itemValues as unknown as UrlParamValue;
    }
  }
  return urlParams;
};
