/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';

/**
 * Returns a flattened version of the input object also accounting for nested properties.
 * @param obj - The input object.
 * @param parentKey - The initial key used for recursive flattening.
 * @returns An object containing all the flattened properties.
 */
export function flattenObject(obj: Record<PropertyKey, unknown>, parentKey: string = '') {
  const result: Record<PropertyKey, unknown> = {};

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (isPlainObject(value)) {
        Object.assign(result, flattenObject(value as Record<PropertyKey, unknown>, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}
