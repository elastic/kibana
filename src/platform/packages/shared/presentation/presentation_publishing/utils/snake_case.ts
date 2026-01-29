/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set, snakeCase } from 'lodash';

export const convertCamelCasedKeysToSnakeCase = (camelCased: {
  [key: string]: any;
}): { [key: string]: any } => {
  const snakeCased: { [key: string]: any } = {};

  const getSnakeCasedStringPath = (path: string, key: string) =>
    `${path}${path.length ? '.' : ''}${snakeCase(key)}`;

  const convertSubObject = (subObject: object, path: string = '') => {
    for (const [key, value] of Object.entries(subObject)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        convertSubObject(value, getSnakeCasedStringPath(path, key));
      } else {
        set(snakeCased, getSnakeCasedStringPath(path, key), value);
      }
    }
  };

  convertSubObject(camelCased); // kick off recursion
  return snakeCased;
};
