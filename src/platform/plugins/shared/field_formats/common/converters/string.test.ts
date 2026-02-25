/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement } from 'react';
import { render } from '@testing-library/react';
import { EMPTY_LABEL, NULL_LABEL } from '@kbn/field-formats-common';
import { StringFormat } from './string';

/**
 * Removes a wrapping span, that is created by the field formatter infrastructure
 * and we're not caring about in these tests.
 * Only used with 'html' output which always returns a string.
 */
function stripSpan(input: string): string {
  return input.replace(/^\<span\>(.*)\<\/span\>$/, '$1');
}

describe('String Format', () => {
  test('convert a string to lower case', () => {
    const string = new StringFormat(
      {
        transform: 'lower',
      },
      jest.fn()
    );
    expect(string.convert('Kibana')).toBe('kibana');
    expect(stripSpan(string.convert('Kibana', 'html'))).toBe('kibana');
  });

  test('convert a string to upper case', () => {
    const string = new StringFormat(
      {
        transform: 'upper',
      },
      jest.fn()
    );
    expect(string.convert('Kibana')).toBe('KIBANA');
    expect(stripSpan(string.convert('Kibana', 'html'))).toBe('KIBANA');
  });

  test('decode a base64 string', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    expect(string.convert('Zm9vYmFy')).toBe('foobar');
    expect(stripSpan(string.convert('Zm9vYmFy', 'html'))).toBe('foobar');
  });

  test('convert a string to title case', () => {
    const string = new StringFormat(
      {
        transform: 'title',
      },
      jest.fn()
    );
    expect(string.convert('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(stripSpan(string.convert('PLEASE DO NOT SHOUT', 'html'))).toBe('Please Do Not Shout');
    expect(string.convert('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(stripSpan(string.convert('Mean, variance and standard_deviation.', 'html'))).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convert('Stay CALM!')).toBe('Stay Calm!');
    expect(stripSpan(string.convert('Stay CALM!', 'html'))).toBe('Stay Calm!');
  });

  test('convert a string to short case', () => {
    const string = new StringFormat(
      {
        transform: 'short',
      },
      jest.fn()
    );
    expect(string.convert('dot.notated.string')).toBe('d.n.string');
    expect(stripSpan(string.convert('dot.notated.string', 'html'))).toBe('d.n.string');
  });

  test('convert a string to unknown transform case', () => {
    const string = new StringFormat(
      {
        transform: 'unknown_transform',
      },
      jest.fn()
    );
    const value = 'test test test';
    expect(string.convert(value)).toBe(value);
  });

  test('decode a URL Param string', () => {
    const string = new StringFormat(
      {
        transform: 'urlparam',
      },
      jest.fn()
    );
    expect(string.convert('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')).toBe('안녕 키바나');
    expect(
      stripSpan(string.convert('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98', 'html'))
    ).toBe('안녕 키바나');
  });

  test('outputs specific empty value', () => {
    const string = new StringFormat();
    expect(string.convert('')).toBe(EMPTY_LABEL);
    expect(stripSpan(string.convert('', 'html'))).toBe(
      `<span class="ffString__emptyValue">${EMPTY_LABEL}</span>`
    );
  });

  test('outputs specific missing value', () => {
    const string = new StringFormat();
    expect(string.convert(null)).toBe(NULL_LABEL);
    expect(string.convert(undefined)).toBe(NULL_LABEL);
    expect(stripSpan(string.convert(null, 'html'))).toBe(
      `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
    );
    expect(stripSpan(string.convert(undefined, 'html'))).toBe(
      `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
    );
  });

  test('does escape value while highlighting', () => {
    const string = new StringFormat();
    expect(
      stripSpan(
        string.convert('<img />', 'html', {
          field: { name: 'foo' },
          hit: {
            highlight: { foo: ['@kibana-highlighted-field@<img />@/kibana-highlighted-field@'] },
          },
        })
      )
    ).toBe('<mark class="ffSearch__highlight">&lt;img /&gt;</mark>');
  });

  describe('react content type', () => {
    test('returns plain text for simple values with transform', () => {
      const lower = new StringFormat({ transform: 'lower' }, jest.fn());
      expect(lower.convert('Kibana', 'react')).toBe('kibana');

      const upper = new StringFormat({ transform: 'upper' }, jest.fn());
      expect(upper.convert('Kibana', 'react')).toBe('KIBANA');
    });

    test('returns highlighted <mark> elements for matching highlights', () => {
      const string = new StringFormat({}, jest.fn());
      const result = string.convert('test value', 'react', {
        field: { name: 'foo' },
        hit: {
          highlight: {
            foo: ['@kibana-highlighted-field@test value@/kibana-highlighted-field@'],
          },
        },
      });
      expect(isValidElement(result)).toBe(true);
      const { container } = render(React.createElement(React.Fragment, null, result));
      const mark = container.querySelector('mark.ffSearch__highlight');
      expect(mark).not.toBeNull();
      expect(mark!.textContent).toBe('test value');
    });

    test('returns empty-value span with correct label for empty string', () => {
      const string = new StringFormat();
      const result = string.convert('', 'react');
      expect(isValidElement(result)).toBe(true);
      const { container } = render(React.createElement(React.Fragment, null, result));
      const span = container.querySelector('.ffString__emptyValue');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe(EMPTY_LABEL);
    });

    test('returns null-value span with correct label for null/undefined', () => {
      const string = new StringFormat();
      for (const val of [null, undefined]) {
        const result = string.convert(val, 'react');
        expect(isValidElement(result)).toBe(true);
        const { container } = render(React.createElement(React.Fragment, null, result));
        const span = container.querySelector('.ffString__emptyValue');
        expect(span).not.toBeNull();
        expect(span!.textContent).toBe(NULL_LABEL);
      }
    });

    test('escapes XSS in highlighted react output', () => {
      const string = new StringFormat({}, jest.fn());
      const result = string.convert('<script>alert("xss")</script>', 'react', {
        field: { name: 'foo' },
        hit: {
          highlight: {
            foo: [
              '@kibana-highlighted-field@<script>alert("xss")</script>@/kibana-highlighted-field@',
            ],
          },
        },
      });
      expect(isValidElement(result)).toBe(true);
      const { container } = render(React.createElement(React.Fragment, null, result));
      expect(container.querySelector('script')).toBeNull();
      const mark = container.querySelector('mark.ffSearch__highlight');
      expect(mark).not.toBeNull();
      expect(mark!.textContent).toBe('<script>alert("xss")</script>');
    });

    test('returns plain string when no highlights match', () => {
      const string = new StringFormat({}, jest.fn());
      const result = string.convert('no match', 'react', {
        field: { name: 'foo' },
        hit: { highlight: {} },
      });
      expect(result).toBe('no match');
    });
  });
});
