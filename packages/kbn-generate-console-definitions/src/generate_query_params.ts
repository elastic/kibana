/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

import type { DefinitionUrlParams } from '@kbn/console-plugin/common/types';
import type { SpecificationTypes } from './types';
import { convertUrlProperties } from './helpers';

export const generateQueryParams = (
  requestType: SpecificationTypes.Request,
  schema: SpecificationTypes.Model
): DefinitionUrlParams => {
  let urlParams: DefinitionUrlParams = {};
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
        urlParams = convertUrlProperties(properties, urlParams, schema);
      }
    }
  }

  // iterate over properties in query and add it to url params
  urlParams = convertUrlProperties(query, urlParams, schema);

  return urlParams;
};
