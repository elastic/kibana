/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { containsIllegalCharacters } from './contains_illegal_characters';

describe('containsIllegalCharacters', () => {
  it('returns true with illegal characters', () => {
    const isInvalid = containsIllegalCharacters('abc', ['a']);
    expect(isInvalid).toBe(true);
  });

  it('returns false with no illegal characters', () => {
    const isInvalid = containsIllegalCharacters('abc', ['%']);
    expect(isInvalid).toBe(false);
  });
});
