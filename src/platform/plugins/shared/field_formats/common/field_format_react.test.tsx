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
import { FieldFormat } from './field_format';
import { asPrettyString } from './utils';
import type { FieldFormatParams, TextContextTypeOptions, ReactContextTypeConvert } from './types';

const getTestFormat = (
  _params?: FieldFormatParams,
  textConvert = (val: string, options?: TextContextTypeOptions) => asPrettyString(val, options),
  htmlConvert?: (val: string) => string,
  reactConvert?: ReactContextTypeConvert
) =>
  new (class TestFormat extends FieldFormat {
    static id = 'test-format';
    static title = 'Test Format';

    textConvert = textConvert;
    htmlConvert = htmlConvert;
    reactConvert = reactConvert;
  })(_params, jest.fn());

describe('FieldFormat React support', () => {
  describe('#hasReactSupport', () => {
    it('returns false when no reactConvert is defined', () => {
      const f = getTestFormat();
      expect(f.hasReactSupport()).toBe(false);
    });

    it('returns true when reactConvert is defined', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const f = getTestFormat(undefined, undefined, undefined, reactConvert);
      expect(f.hasReactSupport()).toBe(true);
    });
  });

  describe('#convertToReact', () => {
    it('returns undefined when no reactConvert is defined', () => {
      const f = getTestFormat();
      const result = f.convertToReact('test');
      expect(result).toBeUndefined();
    });

    it('returns a React element when reactConvert is defined', () => {
      const reactConvert: ReactContextTypeConvert = (val) => (
        <span data-test-subj="formatted">{String(val)}</span>
      );
      const f = getTestFormat(undefined, undefined, undefined, reactConvert);

      const result = f.convertToReact('hello');
      expect(result).toBeDefined();

      const { getByTestId } = render(<>{result}</>);
      expect(getByTestId('formatted')).toHaveTextContent('hello');
    });

    it('passes options to the reactConvert function', () => {
      const reactConvert: ReactContextTypeConvert = (val, options) => (
        <span data-test-subj="formatted" className={options?.className}>
          {String(val)}
        </span>
      );
      const f = getTestFormat(undefined, undefined, undefined, reactConvert);

      const result = f.convertToReact('hello', { className: 'custom-class' });
      const { getByTestId } = render(<>{result}</>);
      expect(getByTestId('formatted')).toHaveClass('custom-class');
    });

    it('handles array values with delimiters', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const f = getTestFormat(undefined, undefined, undefined, reactConvert);

      const result = f.convertToReact(['a', 'b', 'c']);
      const { container } = render(<>{result}</>);

      // Array with 3 items should have brackets and commas
      expect(container.textContent).toContain('a');
      expect(container.textContent).toContain('b');
      expect(container.textContent).toContain('c');

      // Should have array delimiter highlights
      const highlights = container.querySelectorAll('.ffArray__highlight');
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('maintains memoization of convertObject', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const f = getTestFormat(undefined, undefined, undefined, reactConvert);

      // First call should setup convertObject
      f.convertToReact('test1');
      const firstConvertObject = f.convertObject;

      // Second call should reuse the same convertObject
      f.convertToReact('test2');
      expect(f.convertObject).toBe(firstConvertObject);
    });
  });

  describe('setupContentType', () => {
    it('includes react converter when reactConvert is defined', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const f = getTestFormat(undefined, undefined, undefined, reactConvert);

      const convertObject = f.setupContentType();
      expect(convertObject.react).toBeDefined();
      expect(typeof convertObject.react).toBe('function');
    });

    it('sets react to undefined when no reactConvert is defined', () => {
      const f = getTestFormat();

      const convertObject = f.setupContentType();
      expect(convertObject.react).toBeUndefined();
    });

    it('text and html converters remain functional alongside react', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const f = getTestFormat(
        undefined,
        () => 'text-value',
        () => '<b>html-value</b>',
        reactConvert
      );

      expect(f.convert('test', 'text')).toBe('text-value');
      expect(f.convert('test', 'html')).toBe('<b>html-value</b>');
      expect(f.convertToReact('test')).toBeDefined();
    });
  });
});
