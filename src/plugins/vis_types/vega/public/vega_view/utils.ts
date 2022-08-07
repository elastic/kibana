/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ensureNoUnsafeProperties } from '@kbn/std';

export function normalizeDate(date: unknown) {
  if (typeof date === 'number') {
    return !isNaN(date) ? date : null;
  } else if (date instanceof Date) {
    return date;
  } else {
    return normalizeObject(date);
  }
}

/*
Recursive function to check a nested object for a function property
This function should run before JSON.stringify to ensure that functions such as toJSON
are not invoked. We dont use the replacer function as it doesnt catch the toJSON function
*/
export function checkObjectForFunctionProperty(object: unknown): boolean {
  if (object === null || object === undefined) {
    return false;
  }
  if (typeof object === 'function') {
    return true;
  }
  if (object && typeof object === 'object') {
    return Object.values(object).some(
      (value) => typeof value === 'function' || checkObjectForFunctionProperty(value)
    );
  }

  return false;
}
/*
  We want to be strict here when an object is passed to a Vega function
  - NaN (will be converted to null)
  - undefined (key will be removed)
  - Date (will be replaced by its toString value)
  - will throw an error when a function is found
  */
export function normalizeObject(object: unknown) {
  if (checkObjectForFunctionProperty(object)) {
    throw new Error('a function cannot be used as a property name');
  }
  const normalizedObject = object ? JSON.parse(JSON.stringify(object)) : null;
  ensureNoUnsafeProperties(normalizedObject);
  return normalizedObject;
}

export function normalizeString(string: unknown) {
  return typeof string === 'string' ? string : undefined;
}
