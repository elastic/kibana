/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BooleanFromString } from './boolean_from_string';

describe('BooleanFromString', () => {
  it('should return true when input is "true"', () => {
    expect(BooleanFromString.parse('true')).toBe(true);
  });

  it('should return false when input is "false"', () => {
    expect(BooleanFromString.parse('false')).toBe(false);
  });

  it('should return true when input is true', () => {
    expect(BooleanFromString.parse(true)).toBe(true);
  });

  it('should return false when input is false', () => {
    expect(BooleanFromString.parse(false)).toBe(false);
  });

  it('should throw an error when input is not a boolean or "true" or "false"', () => {
    expect(() => BooleanFromString.parse('not a boolean')).toThrow();
    expect(() => BooleanFromString.parse(42)).toThrow();
  });
});
