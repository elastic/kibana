/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get, snakeCase } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { SnakeCasedKeys } from './types';

/**
 * This function takes an object and recursively converts all of the keys to `snaked_cased`
 * @param input The object with `camelCased` keys
 * @returns The object with `snake_cased` keys
 */
export const convertCamelCasedKeysToSnakeCase = <StateType extends object = object>(
  input: StateType
): SnakeCasedKeys<StateType> => {
  const snakeCased = {} as SnakeCasedKeys<StateType>;

  const convertSubObject = (subObject: object, path: string = '') => {
    for (const [key, value] of Object.entries(subObject)) {
      const currentPath = `${path}${path.length ? '.' : ''}${snakeCase(key)}`;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        convertSubObject(value, currentPath);
      } else {
        /**
         * The values for keys that are already snake cased should be prioritized. For example,
         * if you have an object with both the snake cased **and** camel cased version of the same
         * key, then the value should always come from the snake cased key
         */
        const existingSnakeCasedValue = get(input, currentPath);
        if (existingSnakeCasedValue) {
          set(snakeCased, currentPath, existingSnakeCasedValue);
        } else {
          set(snakeCased, currentPath, value);
        }
      }
    }
  };

  convertSubObject(input); // kick off recursion
  return snakeCased;
};
