/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_LABEL, NULL_LABEL } from '@kbn/field-formats-common';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';
import { StringFormat } from './string';
import {
  expectReactElementWithNull,
  expectReactElementWithBlank,
  expectReactElementAsArray,
} from '../test_utils';

/**
 * Removes a wrapping span, that is created by the field formatter infrastructure
 * and we're not caring about in these tests.
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
    expect(string.convert('Kibana', TEXT_CONTEXT_TYPE)).toBe('kibana');
    expect(stripSpan(string.convert('Kibana', HTML_CONTEXT_TYPE))).toBe('kibana');
    expect(string.reactConvert('Kibana')).toBe('kibana');
  });

  test('convert a string to upper case', () => {
    const string = new StringFormat(
      {
        transform: 'upper',
      },
      jest.fn()
    );
    expect(string.convert('Kibana', TEXT_CONTEXT_TYPE)).toBe('KIBANA');
    expect(stripSpan(string.convert('Kibana', HTML_CONTEXT_TYPE))).toBe('KIBANA');
    expect(string.reactConvert('Kibana')).toBe('KIBANA');
  });

  test('decode a base64 string', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    expect(string.convert('Zm9vYmFy', TEXT_CONTEXT_TYPE)).toBe('foobar');
    expect(stripSpan(string.convert('Zm9vYmFy', HTML_CONTEXT_TYPE))).toBe('foobar');
    expect(string.reactConvert('Zm9vYmFy')).toBe('foobar');
  });

  test('convert a string to title case', () => {
    const string = new StringFormat(
      {
        transform: 'title',
      },
      jest.fn()
    );
    expect(string.convert('PLEASE DO NOT SHOUT', TEXT_CONTEXT_TYPE)).toBe('Please Do Not Shout');
    expect(stripSpan(string.convert('PLEASE DO NOT SHOUT', HTML_CONTEXT_TYPE))).toBe(
      'Please Do Not Shout'
    );
    expect(string.reactConvert('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(string.convert('Mean, variance and standard_deviation.', TEXT_CONTEXT_TYPE)).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(
      stripSpan(string.convert('Mean, variance and standard_deviation.', HTML_CONTEXT_TYPE))
    ).toBe('Mean, Variance And Standard_deviation.');
    expect(string.reactConvert('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convert('Stay CALM!', TEXT_CONTEXT_TYPE)).toBe('Stay Calm!');
    expect(stripSpan(string.convert('Stay CALM!', HTML_CONTEXT_TYPE))).toBe('Stay Calm!');
    expect(string.reactConvert('Stay CALM!')).toBe('Stay Calm!');
  });

  test('convert a string to short case', () => {
    const string = new StringFormat(
      {
        transform: 'short',
      },
      jest.fn()
    );
    expect(string.convert('dot.notated.string', TEXT_CONTEXT_TYPE)).toBe('d.n.string');
    expect(stripSpan(string.convert('dot.notated.string', HTML_CONTEXT_TYPE))).toBe('d.n.string');
    expect(string.reactConvert('dot.notated.string')).toBe('d.n.string');
  });

  test('convert a string to unknown transform case', () => {
    const string = new StringFormat(
      {
        transform: 'unknown_transform',
      },
      jest.fn()
    );
    const value = 'test test test';
    expect(string.convert(value, TEXT_CONTEXT_TYPE)).toBe(value);
    expect(stripSpan(string.convert(value, HTML_CONTEXT_TYPE))).toBe(value);
    expect(string.reactConvert(value)).toBe(value);
  });

  test('decode a URL Param string', () => {
    const string = new StringFormat(
      {
        transform: 'urlparam',
      },
      jest.fn()
    );
    expect(
      string.convert('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98', TEXT_CONTEXT_TYPE)
    ).toBe('안녕 키바나');
    expect(
      stripSpan(
        string.convert('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98', HTML_CONTEXT_TYPE)
      )
    ).toBe('안녕 키바나');
    expect(string.reactConvert('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')).toBe(
      '안녕 키바나'
    );
  });

  test('outputs specific empty value', () => {
    const string = new StringFormat();
    expect(string.convert('', TEXT_CONTEXT_TYPE)).toBe(EMPTY_LABEL);
    expect(stripSpan(string.convert('', HTML_CONTEXT_TYPE))).toBe(
      `<span class="ffString__emptyValue">${EMPTY_LABEL}</span>`
    );
    expectReactElementWithBlank(string.reactConvert(''));
  });

  test('outputs specific missing value', () => {
    const string = new StringFormat();
    expect(string.convert(null, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
    expect(string.convert(undefined, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
    expect(stripSpan(string.convert(null, HTML_CONTEXT_TYPE))).toBe(
      `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
    );
    expect(stripSpan(string.convert(undefined, HTML_CONTEXT_TYPE))).toBe(
      `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
    );
    expectReactElementWithNull(string.reactConvert(null));
    expectReactElementWithNull(string.reactConvert(undefined));
  });

  test('does escape value while highlighting', () => {
    const string = new StringFormat();
    const options = {
      field: { name: 'foo' },
      hit: {
        highlight: { foo: ['@kibana-highlighted-field@<img />@/kibana-highlighted-field@'] },
      },
    };
    expect(stripSpan(string.convert('<img />', HTML_CONTEXT_TYPE, options))).toBe(
      '<mark class="ffSearch__highlight">&lt;img /&gt;</mark>'
    );
    expect(string.reactConvert('<img />', options)).toMatchInlineSnapshot(`
      <mark
        className="ffSearch__highlight"
      >
        &lt;img /&gt;
      </mark>
    `);
  });

  test('escapes HTML characters without highlights', () => {
    const string = new StringFormat();
    expect(string.convert('<script>alert("test")</script>', HTML_CONTEXT_TYPE)).toBe(
      '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;'
    );
    expect(string.reactConvert('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const string = new StringFormat();

    expect(string.convert(['foo', 'bar'], TEXT_CONTEXT_TYPE)).toBe('["foo","bar"]');
    expect(string.convert(['foo', 'bar'], HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffArray__highlight">[</span>foo<span class="ffArray__highlight">,</span> bar<span class="ffArray__highlight">]</span>'
    );
    expectReactElementAsArray(string.reactConvert(['foo', 'bar']), ['foo', 'bar']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const string = new StringFormat();

    expect(string.convert(['hello'], TEXT_CONTEXT_TYPE)).toBe('["hello"]');
    expect(string.convert(['hello'], HTML_CONTEXT_TYPE)).toBe('hello');
    expect(string.reactConvert(['hello'])).toBe('hello');
  });

  test('returns empty for an empty array', () => {
    const string = new StringFormat();

    expect(string.convert([], TEXT_CONTEXT_TYPE)).toBe('[]');
    expect(string.convert([], HTML_CONTEXT_TYPE)).toBe('');
    expect(string.reactConvert([])).toBe('');
  });
});
