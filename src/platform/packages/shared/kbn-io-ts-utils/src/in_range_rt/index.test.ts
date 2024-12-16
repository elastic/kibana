/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inRangeRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('inRangeRT', () => {
  test('passes if value is within range', () => {
    expect(isRight(inRangeRt(1, 100).decode(50))).toBe(true);
  });

  test('fails if value above the range', () => {
    expect(isRight(inRangeRt(1, 100).decode(101))).toBe(false);
  });

  test('fails if value below the range', () => {
    expect(isRight(inRangeRt(1, 100).decode(0))).toBe(false);
  });
});
