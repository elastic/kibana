/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isGreaterOrEqualRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('inRangeRT', () => {
  test('passes if value is a positive number', () => {
    expect(isRight(isGreaterOrEqualRt(0).decode(1))).toBe(true);
  });

  test('passes if value is 0', () => {
    expect(isRight(isGreaterOrEqualRt(0).decode(0))).toBe(true);
  });

  test('fails if value is a negative number', () => {
    expect(isRight(isGreaterOrEqualRt(0).decode(-1))).toBe(false);
  });
});
