/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { oneOf } from './validators';

describe('oneOf', () => {
  const validator = oneOf('a', 'b', 'c');

  it('should return true when the value is among the allowed', () => {
    expect(validator('a')).toBe(true);
  });

  it('should throw an error when the value is not among the allowed', () => {
    expect(() => validator('d')).toThrowError(
      '"d" is not among the allowed options: "a", "b", "c"'
    );
  });
});
