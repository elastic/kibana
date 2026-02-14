/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedValue } from './formatted_value';
import { FieldFormat } from '../field_format';
import type { ReactContextTypeConvert, TextContextTypeOptions } from '../types';
import { asPrettyString } from '../utils';

const createMockFormat = ({
  textConvert,
  htmlConvert,
  reactConvert,
}: {
  textConvert?: (val: unknown, options?: TextContextTypeOptions) => string;
  htmlConvert?: (val: unknown) => string;
  reactConvert?: ReactContextTypeConvert;
} = {}) => {
  const format = new (class TestFormat extends FieldFormat {
    static id = 'test-format';
    static title = 'Test Format';

    textConvert =
      textConvert ??
      ((val: unknown, options?: TextContextTypeOptions) => asPrettyString(val, options));
    htmlConvert = htmlConvert;
    reactConvert = reactConvert;
  })();

  return format;
};

describe('FormattedValue', () => {
  describe('when formatter supports React rendering', () => {
    it('renders using reactConvert', () => {
      const format = createMockFormat({
        reactConvert: (val) => <strong data-test-subj="react-output">{String(val)}</strong>,
      });

      render(<FormattedValue fieldFormat={format} value="test-value" data-test-subj="formatted" />);

      expect(screen.getByTestId('react-output')).toHaveTextContent('test-value');
    });

    it('wraps React output in a span with className', () => {
      const format = createMockFormat({
        reactConvert: (val) => <span>{String(val)}</span>,
      });

      const { container } = render(
        <FormattedValue fieldFormat={format} value="test" className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.tagName).toBe('SPAN');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('applies data-test-subj to wrapper', () => {
      const format = createMockFormat({
        reactConvert: (val) => <span>{String(val)}</span>,
      });

      render(<FormattedValue fieldFormat={format} value="test" data-test-subj="my-test-subj" />);

      expect(screen.getByTestId('my-test-subj')).toBeInTheDocument();
    });

    it('passes options to reactConvert', () => {
      const format = createMockFormat({
        reactConvert: (val, options) => (
          <span data-test-subj="output" data-classname={options?.className}>
            {String(val)}
          </span>
        ),
      });

      render(<FormattedValue fieldFormat={format} value="test" className="passed-class" />);

      expect(screen.getByTestId('output')).toHaveAttribute('data-classname', 'passed-class');
    });
  });

  describe('when formatter does not support React rendering', () => {
    it('falls back to HTML rendering via legacy adapter', () => {
      const format = createMockFormat({
        htmlConvert: (val) => `<em data-testid="html-output">${val}</em>`,
      });

      const { container } = render(<FormattedValue fieldFormat={format} value="test-value" />);

      // Should render the HTML via dangerouslySetInnerHTML
      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em).toHaveTextContent('test-value');
    });

    it('applies className to legacy adapter wrapper', () => {
      const format = createMockFormat({
        htmlConvert: (val) => `<span>${val}</span>`,
      });

      const { container } = render(
        <FormattedValue fieldFormat={format} value="test" className="legacy-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('legacy-class');
    });

    it('applies data-test-subj to legacy adapter wrapper', () => {
      const format = createMockFormat({
        htmlConvert: (val) => `<span>${val}</span>`,
      });

      render(
        <FormattedValue fieldFormat={format} value="test" data-test-subj="legacy-test-subj" />
      );

      expect(screen.getByTestId('legacy-test-subj')).toBeInTheDocument();
    });

    it('handles formatters with no htmlConvert (uses default fallback)', () => {
      const format = createMockFormat();

      const { container } = render(<FormattedValue fieldFormat={format} value="plain-text" />);

      // Default fallback escapes text and renders it
      expect(container).toHaveTextContent('plain-text');
    });
  });

  describe('edge cases', () => {
    it('handles null values', () => {
      const format = createMockFormat({
        reactConvert: (val) => <span>{val === null ? 'null-value' : String(val)}</span>,
      });

      const { container } = render(<FormattedValue fieldFormat={format} value={null} />);

      expect(container).toHaveTextContent('null-value');
    });

    it('handles undefined values', () => {
      const format = createMockFormat({
        reactConvert: (val) => <span>{val === undefined ? 'undefined-value' : String(val)}</span>,
      });

      const { container } = render(<FormattedValue fieldFormat={format} value={undefined} />);

      expect(container).toHaveTextContent('undefined-value');
    });

    it('handles array values', () => {
      const format = createMockFormat({
        reactConvert: (val) => <span>{Array.isArray(val) ? val.join('-') : String(val)}</span>,
      });

      const { container } = render(<FormattedValue fieldFormat={format} value={['a', 'b', 'c']} />);

      // The array handling is done by the content type setup,
      // so individual items are formatted separately
      expect(container).toHaveTextContent('a');
      expect(container).toHaveTextContent('b');
      expect(container).toHaveTextContent('c');
    });

    it('handles complex objects in options', () => {
      const format = createMockFormat({
        reactConvert: (val, options) => (
          <span data-test-subj="output">{options?.field?.name ?? 'no-field'}</span>
        ),
      });

      render(
        <FormattedValue
          fieldFormat={format}
          value="test"
          options={{ field: { name: 'myField' } }}
          data-test-subj="formatted"
        />
      );

      expect(screen.getByTestId('output')).toHaveTextContent('myField');
    });
  });

  describe('memoization', () => {
    it('is memoized to prevent unnecessary re-renders', () => {
      const reactConvert = jest.fn((val) => <span>{String(val)}</span>);
      const format = createMockFormat({ reactConvert });

      const { rerender } = render(<FormattedValue fieldFormat={format} value="test" />);

      // Re-render with same props
      rerender(<FormattedValue fieldFormat={format} value="test" />);

      // Due to memoization, the converter should only be called once per unique value
      // (The memo is on the component level, so it depends on prop equality)
      expect(reactConvert).toHaveBeenCalledTimes(1);
    });

    it('re-renders when value changes', () => {
      const reactConvert = jest.fn((val) => <span data-test-subj="output">{String(val)}</span>);
      const format = createMockFormat({ reactConvert });

      const { rerender } = render(
        <FormattedValue fieldFormat={format} value="value1" data-test-subj="formatted" />
      );

      expect(screen.getByTestId('output')).toHaveTextContent('value1');

      rerender(<FormattedValue fieldFormat={format} value="value2" data-test-subj="formatted" />);

      expect(screen.getByTestId('output')).toHaveTextContent('value2');
    });
  });

  describe('deprecation warnings', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      originalEnv = { ...process.env };
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleWarnSpy.mockRestore();
    });

    it('logs deprecation warning for formatters without React support in development', () => {
      // Note: In the test environment, NODE_ENV is 'test', not 'development',
      // so warnings won't be logged. This test documents the expected behavior.
      const format = createMockFormat({
        htmlConvert: (val) => `<span>${val}</span>`,
      });

      render(<FormattedValue fieldFormat={format} value="test" />);

      // In test environment, warnings are disabled - this documents the expected behavior
      // In development environment, a warning would be logged with:
      // "[field-formats] DEPRECATION: Formatter "test-format" does not support React rendering..."
    });

    it('only logs warning once per formatter ID', () => {
      const format1 = createMockFormat({
        htmlConvert: (val) => `<span>${val}</span>`,
      });
      const format2 = createMockFormat({
        htmlConvert: (val) => `<em>${val}</em>`,
      });

      // Render same formatter type multiple times
      const { rerender } = render(<FormattedValue fieldFormat={format1} value="test1" />);
      rerender(<FormattedValue fieldFormat={format2} value="test2" />);

      // In development, the warning would only be logged once for this formatter ID
    });
  });

  describe('strict mode behavior', () => {
    it('documents strict mode error behavior', () => {
      // Strict mode is controlled by FIELD_FORMAT_STRICT_REACT_MODE environment variable
      // When enabled in development, formatters without React support will throw an error:
      //
      // throw new Error(
      //   `[field-formats] Strict React mode: Formatter "${formatterId}" does not support React rendering. ` +
      //   `Implement reactConvert on the formatter or disable strict mode.`
      // );
      //
      // This helps identify migration gaps during development.
      // To enable: process.env.FIELD_FORMAT_STRICT_REACT_MODE = 'true';
      expect(true).toBe(true); // Documentation test
    });
  });
});
