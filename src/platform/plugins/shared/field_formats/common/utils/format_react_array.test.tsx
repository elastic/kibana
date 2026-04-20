/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import { formatReactArray } from './format_react_array';

function render(node: React.ReactNode): string {
  return ReactDOM.renderToStaticMarkup(<>{node}</>).replace(/&quot;/g, '"');
}

const open = '<span class="ffArray__highlight">[</span>';
const close = '<span class="ffArray__highlight">]</span>';
const comma = '<span class="ffArray__highlight">,</span>';

describe('formatReactArray', () => {
  describe('empty and single-element arrays', () => {
    test('returns empty string for an empty array', () => {
      expect(formatReactArray([], String)).toBe('');
    });

    test('returns the single converted value without brackets', () => {
      expect(formatReactArray(['hello'], String)).toBe('hello');
    });

    test('returns empty string when the single element converts to null', () => {
      expect(formatReactArray(['x'], () => null)).toBe('');
    });
  });

  describe('multi-element arrays — single-line values', () => {
    test('wraps two elements with one comma', () => {
      expect(render(formatReactArray(['a', 'b'], String))).toBe(`${open}a${comma} b${close}`);
    });

    test('wraps three or more elements with a comma between each pair', () => {
      expect(render(formatReactArray([1, 2, 3], String))).toBe(
        `${open}1${comma} 2${comma} 3${close}`
      );
    });

    test('uses the same single-line layout when convertSingle returns React elements', () => {
      expect(render(formatReactArray(['a', 'b'], (v) => <mark>{String(v)}</mark>))).toBe(
        `${open}<mark>a</mark>${comma} <mark>b</mark>${close}`
      );
    });
  });

  describe('multi-element arrays — multiline mode with plain string nodes', () => {
    test('triggers multiline mode when a string node contains a newline', () => {
      expect(render(formatReactArray(['a\nb', 'c'], String))).toBe(
        `${open}\n  a\n  b${comma}\n  c\n${close}`
      );
    });

    test('indents each inner newline by two spaces', () => {
      expect(render(formatReactArray(['{\n  "x": 1\n}', '{\n  "y": 2\n}'], String))).toBe(
        `${open}\n` + `  {\n    "x": 1\n  }${comma}\n` + `  {\n    "y": 2\n  }\n` + `${close}`
      );
    });

    test('preserves blank lines (consecutive newlines) by only indenting after the run', () => {
      // \n\n should become \n\n  (the blank line is kept, indent appended after the run)
      // not \n  \n  (which would wrongly add spaces to the blank line itself)
      expect(render(formatReactArray(['a\n\nb', 'c'], String))).toBe(
        `${open}\n  a\n\n  b${comma}\n  c\n${close}`
      );
    });
  });

  describe('multi-element arrays — multiline mode with React element nodes', () => {
    // These cases arise when convertSingle returns a React element rather than a plain string,
    // e.g. getHighlightReact wrapping a search-highlighted multiline JSON value in <mark> nodes.

    test('indents newlines inside a React element child', () => {
      const convertSingle = (v: unknown) => <mark>{`${v}\nline2`}</mark>;

      expect(render(formatReactArray(['top', 'top'], convertSingle))).toBe(
        `${open}\n` +
          `  <mark>top\n  line2</mark>${comma}\n` +
          `  <mark>top\n  line2</mark>\n` +
          `${close}`
      );
    });

    test('indents newlines nested deep in a React element tree', () => {
      const convertSingle = () => (
        <span>
          <em>{'top\nindented'}</em>
        </span>
      );

      expect(render(formatReactArray(['a', 'b'], convertSingle))).toBe(
        `${open}\n` +
          `  <span><em>top\n  indented</em></span>${comma}\n` +
          `  <span><em>top\n  indented</em></span>\n` +
          `${close}`
      );
    });

    test('triggers multiline mode and indents when a React fragment has array children containing a newline', () => {
      // Mimics getHighlightReact('match\nrest', [hl('match')]) output:
      // <><mark>match</mark>{'\nrest'}</> — children is an array, exercising the Array.isArray
      // branch in both hasNewline and indentNode.
      const convertSingle = () => (
        <>
          <mark>match</mark>
          {'\nrest'}
        </>
      );

      expect(render(formatReactArray(['a', 'b'], convertSingle))).toBe(
        `${open}\n` +
          `  <mark>match</mark>\n  rest${comma}\n` +
          `  <mark>match</mark>\n  rest\n` +
          `${close}`
      );
    });
  });
});
