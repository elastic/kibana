/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StringFormat } from './string';

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
    expect(string.convert('')).toBe('(empty)');
    expect(stripSpan(string.convert('', 'html'))).toBe(
      '<span class="ffString__emptyValue">(empty)</span>'
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
    ).toBe('<mark>&lt;img /&gt;</mark>');
  });
});
