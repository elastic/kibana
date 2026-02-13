/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BoolFormat } from './boolean';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';
import { EMPTY_VALUE_CLASS } from '../components';

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
      expect(boolean.convert(data.input)).toBe(data.expected);
    });
  });

  test('does not convert non-boolean values, instead returning original value', () => {
    const s = 'non-boolean value!!';

    expect(boolean.convert(s)).toBe(s);
  });

  test('handles a missing value', () => {
    expect(boolean.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(boolean.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(boolean.convert(null, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(boolean.convert(undefined, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
  });

  describe('React conversion', () => {
    test('has React support', () => {
      expect(boolean.hasReactSupport()).toBe(true);
    });

    test('converts boolean values to React elements', () => {
      const result = boolean.convertToReact(true);
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('true');
    });

    test('converts false to React element', () => {
      const result = boolean.convertToReact(false);
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('false');
    });

    test('handles missing values in React conversion', () => {
      const resultNull = boolean.convertToReact(null);
      const { container: containerNull } = render(<>{resultNull}</>);
      expect(containerNull.textContent).toBe('(null)');
      expect(containerNull.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();

      const resultUndefined = boolean.convertToReact(undefined);
      const { container: containerUndefined } = render(<>{resultUndefined}</>);
      expect(containerUndefined.textContent).toBe('(null)');
      expect(containerUndefined.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
    });

    test('converts non-boolean values correctly', () => {
      const result = boolean.convertToReact('not a boolean');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('not a boolean');
    });
  });
});
