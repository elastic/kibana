/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { FieldHook } from '../types';

interface GenericObject {
  [key: string]: any;
}

export const unflattenObject = <T extends object = GenericObject>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

/**
 * Wrap the key with [] if it is a key from an Array
 * @param key The object key
 * @param isArrayItem Flag to indicate if it is the key of an Array
 */
const renderKey = (key: string, isArrayItem: boolean): string => (isArrayItem ? `[${key}]` : key);

export const flattenObject = (
  obj: GenericObject,
  prefix: string[] = [],
  isArrayItem = false
): GenericObject =>
  Object.keys(obj).reduce<GenericObject>((acc, k) => {
    const nextValue = obj[k];

    if (typeof nextValue === 'object' && nextValue !== null) {
      const isNextValueArray = Array.isArray(nextValue);
      const dotSuffix = isNextValueArray ? '' : '.';

      if (Object.keys(nextValue).length > 0) {
        return {
          ...acc,
          ...flattenObject(
            nextValue,
            [...prefix, `${renderKey(k, isArrayItem)}${dotSuffix}`],
            isNextValueArray
          ),
        };
      }
    }

    const fullPath = `${prefix.join('')}${renderKey(k, isArrayItem)}`;
    acc[fullPath] = nextValue;

    return acc;
  }, {});

/**
 * Helper to map the object of fields to any of its value
 *
 * @param formFields key value pair of path and form Fields
 * @param fn Iterator function to execute on the field
 */
export const mapFormFields = (
  formFields: Record<string, FieldHook>,
  fn: (field: FieldHook) => any
) =>
  Object.entries(formFields).reduce((acc, [key, field]) => {
    acc[key] = fn(field);
    return acc;
  }, {} as Record<string, unknown>);
