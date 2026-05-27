/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BoolFormat } from './boolean';
import { TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('Boolean Format', () => {
  let boolean: BoolFormat;

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
      expect(boolean.convert(data.input, TEXT_CONTEXT_TYPE)).toBe(data.expected);
      expect(boolean.reactConvert(data.input)).toBe(data.expected);
    });
  });

  test('does not convert non-boolean values, instead returning original value', () => {
    const s = 'non-boolean value!!';

    expect(boolean.convert(s, TEXT_CONTEXT_TYPE)).toBe(s);
    expect(boolean.reactConvert(s)).toBe(s);
  });

  test('handles a missing value', () => {
    expect(boolean.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(boolean.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expectReactElementWithNull(boolean.reactConvert(null));
    expectReactElementWithNull(boolean.reactConvert(undefined));
  });

  test('reactConvert returns raw string for unhighlighted content (React escapes at render)', () => {
    expect(boolean.reactConvert('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    expect(boolean.convert([true, false], TEXT_CONTEXT_TYPE)).toBe('["true","false"]');
    expectReactElementAsArray(boolean.reactConvert([true, false]), ['true', 'false']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    expect(boolean.convert([true], TEXT_CONTEXT_TYPE)).toBe('["true"]');
    expect(boolean.reactConvert([true])).toBe('true');
  });
});
