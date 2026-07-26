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
import { truncateReactNode } from './truncate_react_node';

describe('truncateReactNode', () => {
  const MAX_LENGTH = 10;

  describe('when text is shorter than maxLength', () => {
    it('returns the original string unchanged', () => {
      expect(truncateReactNode('short', MAX_LENGTH, 'short')).toBe('short');
    });

    it('returns the original React element unchanged', () => {
      const node = <mark>short</mark>;
      const result = truncateReactNode(node, MAX_LENGTH, 'short');
      const { container } = render(<>{result}</>);
      expect(container.innerHTML).toBe('<mark>short</mark>');
    });

    it('returns text exactly at maxLength unchanged', () => {
      expect(truncateReactNode('exactly 10', MAX_LENGTH, 'exactly 10')).toBe('exactly 10');
    });

    it('returns null unchanged when text is short', () => {
      expect(truncateReactNode(null, MAX_LENGTH, '')).toBeNull();
    });

    it('returns number unchanged when text is short', () => {
      expect(truncateReactNode(42, MAX_LENGTH, '42')).toBe(42);
    });
  });

  describe('when text is longer than maxLength', () => {
    it('truncates a plain string with ellipsis in middle', () => {
      const text = 'Long text that needs truncation';
      const result = truncateReactNode(text, MAX_LENGTH, text);
      expect(result).toBe('Long ...ation');
    });

    it('preserves React element wrapper when truncating', () => {
      const text = 'Long text that needs truncation';
      const node = <mark>{text}</mark>;
      const result = truncateReactNode(node, MAX_LENGTH, text);
      const { container } = render(<>{result}</>);
      // Should preserve the <mark> wrapper with truncated content inside
      expect(container.innerHTML).toBe('<mark>Long ...ation</mark>');
    });

    it('preserves nested element structure when truncating', () => {
      const text = 'Long text that needs truncation';
      const node = (
        <span className="highlight">
          <mark>{text}</mark>
        </span>
      );
      const result = truncateReactNode(node, MAX_LENGTH, text);
      const { container } = render(<>{result}</>);
      expect(container.querySelector('span.highlight')).toBeInTheDocument();
      expect(container.querySelector('mark')).toBeInTheDocument();
      expect(container.textContent).toBe('Long ...ation');
    });

    it('preserves element attributes after truncation', () => {
      const text = 'Long text that needs truncation';
      const node = (
        <mark className="ffSearch__highlight" data-test="value">
          {text}
        </mark>
      );
      const result = truncateReactNode(node, MAX_LENGTH, text);
      const { container } = render(<>{result}</>);

      const mark = container.querySelector('mark');
      expect(mark).toHaveClass('ffSearch__highlight');
      expect(mark).toHaveAttribute('data-test', 'value');
      expect(mark?.textContent).toBe('Long ...ation');
    });

    it('falls back to plain text for complex multi-element arrays', () => {
      const text = 'First part middle last part of message';
      const node = ['First part ', <mark key="1">middle</mark>, ' last part of message'];
      const result = truncateReactNode(node, 20, text);
      const { container } = render(<>{result}</>);
      // Complex arrays fall back to plain truncated text
      expect(container.textContent).toBe('First part...of message');
    });
  });

  describe('edge cases with small maxLength', () => {
    it('truncates correctly when maxLength is 2', () => {
      const text = 'hello';
      const result = truncateReactNode(text, 2, text);
      expect(result).toBe('h...o');
    });
  });
});
