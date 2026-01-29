/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { snakeCase } from 'lodash';

export const convertCamelCasedKeysToSnakeCase = (camelCased: {
  [key: string]: any;
}): { [key: string]: any } => {
  const convertSubObject = (
    camelCasedSubObject: object,
    snakeCased: { [key: string]: any } = {}
  ): object => {
    for (const [key, value] of Object.entries(camelCasedSubObject)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        snakeCased[snakeCase(key)] = convertSubObject(value);
      } else {
        snakeCased[snakeCase(key)] = value;
      }
    }
    return snakeCased;
  };
  return convertSubObject(camelCased);
};
