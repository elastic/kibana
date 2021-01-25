/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BoolFormat } from './boolean';

describe('Boolean Format', () => {
  let boolean: Record<string, any>;

  beforeEach(() => {
    boolean = new BoolFormat({}, jest.fn());
  });

  [
    {
      input: 0,
      expected: 'false',
    },
    {
      input: 'no',
      expected: 'false',
    },
    {
      input: false,
      expected: 'false',
    },
    {
      input: 'false',
      expected: 'false',
    },
    {
      input: 1,
      expected: 'true',
    },
    {
      input: 'yes',
      expected: 'true',
    },
    {
      input: true,
      expected: 'true',
    },
    {
      input: 'true',
      expected: 'true',
    },
    {
      input: ' True  ', // should handle trailing and mixed case
      expected: 'true',
    },
  ].forEach((data) => {
    test(`convert ${data.input} to boolean`, () => {
      expect(boolean.convert(data.input)).toBe(data.expected);
    });
  });

  test('does not convert non-boolean values, instead returning original value', () => {
    const s = 'non-boolean value!!';

    expect(boolean.convert(s)).toBe(s);
  });
});
