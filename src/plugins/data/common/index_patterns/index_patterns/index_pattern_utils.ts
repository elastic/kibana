/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RuntimeField, RuntimeType, RuntimeComposite, ESRuntimeField } from '../types';

/**
 * Method to aggregate all the runtime fields which are **not** created
 * from a parent composite runtime field.
 * @returns A map of runtime fields
 */
export const getRuntimeFieldsFromMap = (
  runtimeFieldMap: Record<string, RuntimeField>
): Record<string, ESRuntimeField> => {
  return Object.entries(runtimeFieldMap).reduce((acc, [name, field]) => {
    const { type, script, parentComposite } = field;

    if (parentComposite !== undefined) {
      return acc;
    }

    const runtimeFieldRequest: RuntimeField = {
      type,
      script,
    };

    return {
      ...acc,
      [name]: runtimeFieldRequest,
    };
  }, {});
};

/**
 * This method reads all the runtime composite fields
 * and aggregate the subFields
 *
 * {
 *   "compositeName": {
 *     "type": "composite",
 *     "script": "emit(...)" // script that emits multiple values
 *     "fields": {  // map of subFields available in the Query
 *       "field_1": {
 *         "type": "keyword"
 *       },
 *       "field_2": {
 *         "type": "ip"
 *       },
 *     }
 *   }
 * }
 *
 * @returns A map of runtime fields
 */
export const getRuntimeCompositeFieldsFromMap = (
  runtimeCompositeMap: Record<string, RuntimeComposite>,
  runtimeFieldGetter: (name: string) => RuntimeField | null
): Record<string, ESRuntimeField> => {
  return Object.entries(runtimeCompositeMap).reduce((acc, [name, runtimeComposite]) => {
    const { script, subFields } = runtimeComposite;

    // Aggregate all the subFields belonging to this runtimeComposite
    const fields: ESRuntimeField['fields'] = subFields.reduce((accFields, subFieldName) => {
      const subField = runtimeFieldGetter(`${name}.${subFieldName}`);

      if (!subField) {
        return accFields;
      }

      return {
        ...accFields,
        [subFieldName]: { type: subField.type },
      };
    }, {} as Record<string, { type: RuntimeType }>);

    if (Object.keys(fields).length === 0) {
      // This should never happen, but sending a composite runtime field
      // with an empty "fields" will break the Query
      return acc;
    }

    const runtimeFieldRequest: ESRuntimeField = {
      type: 'composite',
      script,
      fields,
    };

    return {
      ...acc,
      [name]: runtimeFieldRequest,
    };
  }, {});
};
