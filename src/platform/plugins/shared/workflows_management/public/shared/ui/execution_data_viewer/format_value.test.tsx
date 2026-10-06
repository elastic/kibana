/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@emotion/jest';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { render, renderHook } from '@testing-library/react';
import React from 'react';

import { formatValueAsElement } from './format_value';

const renderValue = (value: unknown) =>
  render(<EuiProvider>{formatValueAsElement(value)}</EuiProvider>);

describe('formatValueAsElement', () => {
  describe('null and undefined', () => {
    it('returns "-" for null', () => {
      expect(formatValueAsElement(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatValueAsElement(undefined)).toBe('-');
    });
  });

  describe('primitive values', () => {
    it('returns string representation of a string value', () => {
      expect(formatValueAsElement('hello')).toBe('hello');
    });

    it('returns string representation of a number', () => {
      expect(formatValueAsElement(42)).toBe('42');
    });

    it('returns string representation of zero', () => {
      expect(formatValueAsElement(0)).toBe('0');
    });

    it('returns string representation of a boolean true', () => {
      expect(formatValueAsElement(true)).toBe('true');
    });

    it('returns string representation of a boolean false', () => {
      expect(formatValueAsElement(false)).toBe('false');
    });

    it('returns string representation of an empty string', () => {
      expect(formatValueAsElement('')).toBe('');
    });
  });

  describe('objects', () => {
    it('returns JSON.stringify of a plain object', () => {
      expect(formatValueAsElement({ key: 'value' })).toBe('{"key":"value"}');
    });

    it('returns JSON.stringify of an empty object', () => {
      expect(formatValueAsElement({})).toBe('{}');
    });

    it('returns JSON.stringify for nested objects', () => {
      expect(formatValueAsElement({ a: { b: 1 } })).toBe('{"a":{"b":1}}');
    });
  });

  describe('arrays', () => {
    it('renders an array with bracket highlights and comma separators', () => {
      const { container } = renderValue(['a', 'b', 'c']);

      const highlights = container.querySelectorAll('span');
      // Opening bracket, two commas, closing bracket = 4 highlighted spans
      expect(highlights).toHaveLength(4);
      expect(highlights[0].textContent).toBe('[');
      expect(highlights[1].textContent).toBe(', ');
      expect(highlights[2].textContent).toBe(', ');
      expect(highlights[3].textContent).toBe(']');

      expect(container.textContent).toBe('[a, b, c]');
    });

    it('styles array punctuation with the EUI theme', () => {
      const { result } = renderHook(() => useEuiTheme(), { wrapper: EuiProvider });
      const { container } = renderValue(['a', 'b']);

      expect(container.querySelector('span')).toHaveStyleRule(
        'color',
        result.current.euiTheme.colors.mediumShade
      );
    });

    it('renders an empty array with only brackets', () => {
      const { container } = renderValue([]);

      const highlights = container.querySelectorAll('span');
      expect(highlights).toHaveLength(2);
      expect(highlights[0].textContent).toBe('[');
      expect(highlights[1].textContent).toBe(']');
      expect(container.textContent).toBe('[]');
    });

    it('renders a single-element array without commas', () => {
      const { container } = renderValue([42]);

      const highlights = container.querySelectorAll('span');
      // Opening bracket and closing bracket only
      expect(highlights).toHaveLength(2);
      expect(container.textContent).toBe('[42]');
    });

    it('renders nested arrays recursively', () => {
      const { container } = renderValue([['inner']]);

      expect(container.textContent).toBe('[[inner]]');
    });

    it('renders objects inside arrays as JSON strings', () => {
      const { container } = renderValue([{ key: 'val' }]);

      expect(container.textContent).toBe('[{"key":"val"}]');
    });

    it('renders null items inside arrays as "-"', () => {
      const { container } = renderValue([null, 'ok']);

      expect(container.textContent).toBe('[-, ok]');
    });
  });
});
