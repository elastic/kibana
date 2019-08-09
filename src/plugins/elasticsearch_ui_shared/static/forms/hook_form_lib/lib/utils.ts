/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Field } from '../types';

const numRegEx = /^\d+$/;

const isNumber = (val: string) => numRegEx.test(val);

export const getAt = (path: string, object: any, throwIfNotFound = true): unknown => {
  const pathToArray = path.split('.');
  const value = object[pathToArray[0]];

  if (pathToArray.length === 1) {
    return value;
  }

  if (value !== null && typeof value === 'object') {
    return getAt(pathToArray.slice(1).join('.'), value, throwIfNotFound);
  }

  if (throwIfNotFound) {
    throw new Error(`Can't access path "${path}" on ${JSON.stringify(object)}`);
  }

  return undefined;
};

const setAt = (path: string, object: any, value: unknown, createUnknownPath = true): any => {
  const pathToArray = path.split('.');

  if (pathToArray.length === 1) {
    object[pathToArray[0]] = value;
    return object;
  }

  let target = object;

  pathToArray.slice(0, -1).forEach((key, i) => {
    if (!{}.hasOwnProperty.call(target, key)) {
      if (createUnknownPath) {
        // If the path segment is a number, we create an Array
        // otherwise we create an object.
        target[key] = isNumber(pathToArray[i + 1]) ? [] : {};
      } else {
        throw new Error(`Can't set value "${value}" at "${path}" on ${JSON.stringify(object)}`);
      }
    }

    target = target[key];

    if (target === null || (typeof target !== 'object' && !Array.isArray(target))) {
      throw new Error(
        `Can't set value "${value}" on a primitive. Path provided: "${path}", target: ${JSON.stringify(
          object
        )}`
      );
    }
  });

  const keyToSet = pathToArray[pathToArray.length - 1];
  target[keyToSet] = value;

  return object;
};

export const unflattenObject = (object: any) =>
  Object.entries(object).reduce((acc, [key, field]) => {
    setAt(key, acc, field);
    return acc;
  }, {});

export const flattenObject = (
  object: Record<string, any>,
  to: Record<string, any> = {},
  paths: string[] = []
): Record<string, any> =>
  Object.entries(object).reduce((acc, [key, value]) => {
    const updatedPaths = [...paths, key];
    if (value !== null && typeof value === 'object') {
      return flattenObject(value, to, updatedPaths);
    }
    acc[updatedPaths.join('.')] = value;
    return acc;
  }, to);

/**
 * Helper to map the object of fields to any of its value
 *
 * @param formFields key value pair of path and form Fields
 * @param fn Iterator function to execute on the field
 */
export const mapFormFields = (formFields: Record<string, Field>, fn: (field: Field) => any) =>
  Object.entries(formFields).reduce(
    (acc, [key, field]) => {
      acc[key] = fn(field);
      return acc;
    },
    {} as Record<string, unknown>
  );
