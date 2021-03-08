/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { keysToCamelCaseShallow } from './case_conversion';

describe('keysToCamelCaseShallow', () => {
  test("should convert all of an object's keys to camel case", () => {
    const data = {
      camelCase: 'camelCase',
      'kebab-case': 'kebabCase',
      snake_case: 'snakeCase',
    };

    const result = keysToCamelCaseShallow(data);

    expect(result.camelCase).toBe('camelCase');
    expect(result.kebabCase).toBe('kebabCase');
    expect(result.snakeCase).toBe('snakeCase');
  });
});
