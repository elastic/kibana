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

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (isPlainObject(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}

/**
 * Returns a flattened version of the input object, giving higher priority to nested fields and flattening them after the other properties.
 * @param obj - The input object.
 * @returns An object containing all the flattened properties.
 */
export function flattenObjectNestedLast<TObj extends Record<PropertyKey, any>>(obj: TObj) {
  const flattened: Record<PropertyKey, GetValuesTypes<TObj>> = {};
  const nested: Record<PropertyKey, GetValuesTypes<TObj>> = {};

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      if (isPlainObject(value)) {
        nested[key] = value;
      } else {
        flattened[key] = value;
      }
    }
  }

  return { ...flattened, ...flattenObject(nested) };
}
