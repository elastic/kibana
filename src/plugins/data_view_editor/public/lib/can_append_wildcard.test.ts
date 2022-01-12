/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { canAppendWildcard } from './can_append_wildcard';

describe('canAppendWildcard', () => {
  test('ignores symbols', () => {
    expect(canAppendWildcard('%')).toBeFalsy();
  });

  test('accepts numbers', () => {
    expect(canAppendWildcard('1')).toBeTruthy();
  });

  test('accepts letters', () => {
    expect(canAppendWildcard('b')).toBeTruthy();
  });

  test('accepts uppercase letters', () => {
    expect(canAppendWildcard('B')).toBeTruthy();
  });

  test('ignores if more than one key pressed', () => {
    expect(canAppendWildcard('ab')).toBeFalsy();
  });
});
