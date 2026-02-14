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
import { setup, hasReactSupport, ARRAY_HIGHLIGHT_CLASS } from './react_content_type';
import { FieldFormat } from '../field_format';
import type { ReactContextTypeConvert } from '../types';

const createMockFormat = (reactConvert?: ReactContextTypeConvert) => {
  const format = new (class TestFormat extends FieldFormat {
    static id = 'test-format';
    static title = 'Test Format';

    textConvert = (val: unknown) => String(val);
    reactConvert = reactConvert;
  })();

  return format;
};

describe('react_content_type', () => {
  describe('setup', () => {
    it('returns undefined when no reactConvert is provided', () => {
      const format = createMockFormat();
      const converter = setup(format, undefined);

      expect(converter).toBeUndefined();
    });

    it('returns a converter function when reactConvert is provided', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const format = createMockFormat(reactConvert);
      const converter = setup(format, reactConvert);

      expect(converter).toBeInstanceOf(Function);
    });

    it('converts simple values using the provided reactConvert', () => {
      const reactConvert: ReactContextTypeConvert = (val) => (
        <span data-test-subj="value">{String(val)}</span>
      );
      const format = createMockFormat(reactConvert);
      const converter = setup(format, reactConvert)!;

      const result = converter('hello');
      const { getByTestId } = render(<>{result}</>);

      expect(getByTestId('value')).toHaveTextContent('hello');
    });

    it('passes options to the converter', () => {
      const reactConvert: ReactContextTypeConvert = (val, options) => (
        <span data-test-subj="value" className={options?.className}>
          {String(val)}
        </span>
      );
      const format = createMockFormat(reactConvert);
      const converter = setup(format, reactConvert)!;

      const result = converter('hello', { className: 'custom-class' });
      const { getByTestId } = render(<>{result}</>);

      expect(getByTestId('value')).toHaveClass('custom-class');
    });

    describe('array handling', () => {
      it('formats array values with delimiters', () => {
        const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
        const format = createMockFormat(reactConvert);
        const converter = setup(format, reactConvert)!;

        const result = converter(['a', 'b', 'c']);
        const { container } = render(<>{result}</>);

        // Should have bracket delimiters for arrays with 2+ items
        const highlights = container.querySelectorAll(`.${ARRAY_HIGHLIGHT_CLASS}`);
        expect(highlights).toHaveLength(4); // [, ,, ,, ]
        expect(highlights[0]).toHaveTextContent('[');
        expect(highlights[1]).toHaveTextContent(',');
        expect(highlights[2]).toHaveTextContent(',');
        expect(highlights[3]).toHaveTextContent(']');
      });

      it('does not add brackets for single-element arrays', () => {
        const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
        const format = createMockFormat(reactConvert);
        const converter = setup(format, reactConvert)!;

        const result = converter(['single']);
        const { container } = render(<>{result}</>);

        // No brackets for single element
        const highlights = container.querySelectorAll(`.${ARRAY_HIGHLIGHT_CLASS}`);
        expect(highlights).toHaveLength(0);
        expect(container).toHaveTextContent('single');
      });

      it('handles nested arrays', () => {
        const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
        const format = createMockFormat(reactConvert);
        const converter = setup(format, reactConvert)!;

        const result = converter(['a', 'b']);
        const { container } = render(<>{result}</>);

        expect(container).toHaveTextContent('[a, b]');
      });

      it('handles empty arrays', () => {
        const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
        const format = createMockFormat(reactConvert);
        const converter = setup(format, reactConvert)!;

        const result = converter([]);
        const { container } = render(<>{result}</>);

        // Empty array should render nothing
        expect(container.textContent).toBe('');
      });
    });
  });

  describe('hasReactSupport', () => {
    it('returns false for formatters without reactConvert', () => {
      const format = createMockFormat();
      expect(hasReactSupport(format)).toBe(false);
    });

    it('returns true for formatters with reactConvert', () => {
      const reactConvert: ReactContextTypeConvert = (val) => <span>{String(val)}</span>;
      const format = createMockFormat(reactConvert);
      expect(hasReactSupport(format)).toBe(true);
    });
  });
});
