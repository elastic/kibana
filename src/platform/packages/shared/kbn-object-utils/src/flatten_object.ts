/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';

type GetValuesTypes<T> = T extends Record<PropertyKey, any>
  ? { [K in keyof T]: GetValuesTypes<T[K]> }[keyof T]
  : T;

/**
 * Returns a flattened version of the input object also accounting for nested properties.
 * @param obj - The input object.
 * @param parentKey - The initial key used for recursive flattening.
 * @returns An object containing all the flattened properties.
 */
export function flattenObject<TObj extends Record<PropertyKey, any>>(
  obj: TObj,
  parentKey: string = ''
) {
  const result: Record<PropertyKey, GetValuesTypes<TObj>> = {};
  const nestedValues: Record<PropertyKey, GetValuesTypes<TObj>> = {};

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (isPlainObject(value)) {
        Object.assign(nestedValues, { [newKey]: value });
      } else {
        result[newKey] = value;
      }
    }
  }

  for (const key in nestedValues) {
    if (Object.hasOwn(nestedValues, key)) {
      const value = nestedValues[key];
      Object.assign(result, flattenObject(value, key));
    }
  }

  return result;
}
